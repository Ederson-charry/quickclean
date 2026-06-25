import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CST } from "./cst";

export interface PayrollExtra {
  concept: string;
  kind: "bono" | "deduccion";
  amount: number;
}

export interface PayrollItem {
  concepto: string;
  tipo: "devengado" | "deduccion";
  monto: number;
}

export interface PayrollBreakdown {
  days: number;
  baseSalary: number;
  transportAllowance: number;
  bonuses: number;
  grossEarnings: number;
  healthDeduction: number;
  pensionDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  items: PayrollItem[];
}

/** Días calendario inclusivos del período (base 30 para el prorrateo CST). */
function inclusiveDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Cálculo puro de la nómina del período según conceptos CST. */
  compute(monthlySalary: number, from: Date, to: Date, extras: PayrollExtra[]): PayrollBreakdown {
    const days = inclusiveDays(from, to);
    const factor = days / 30; // mes comercial de 30 días

    const baseSalary = Math.round(monthlySalary * factor);
    const transportAllowance =
      monthlySalary <= CST.smmlv * CST.auxTransporteMaxSmmlv ? Math.round(CST.auxTransporte * factor) : 0;

    const bonusList = extras.filter((e) => e.kind === "bono");
    const dedList = extras.filter((e) => e.kind === "deduccion");
    const bonuses = bonusList.reduce((s, e) => s + e.amount, 0);

    const grossEarnings = baseSalary + transportAllowance + bonuses;

    // IBC = salario base (el auxilio de transporte no cotiza).
    const healthDeduction = Math.round(baseSalary * CST.healthRate);
    const pensionDeduction = Math.round(baseSalary * CST.pensionRate);
    const otherDeductions = dedList.reduce((s, e) => s + e.amount, 0);
    const totalDeductions = healthDeduction + pensionDeduction + otherDeductions;

    const netPay = grossEarnings - totalDeductions;

    const items: PayrollItem[] = [
      { concepto: "Salario base", tipo: "devengado", monto: baseSalary },
      ...(transportAllowance > 0
        ? [{ concepto: "Auxilio de transporte", tipo: "devengado" as const, monto: transportAllowance }]
        : []),
      ...bonusList.map((e) => ({ concepto: e.concept, tipo: "devengado" as const, monto: e.amount })),
      { concepto: "Salud (4%)", tipo: "deduccion", monto: healthDeduction },
      { concepto: "Pensión (4%)", tipo: "deduccion", monto: pensionDeduction },
      ...dedList.map((e) => ({ concepto: e.concept, tipo: "deduccion" as const, monto: e.amount })),
    ];

    return {
      days,
      baseSalary,
      transportAllowance,
      bonuses,
      grossEarnings,
      healthDeduction,
      pensionDeduction,
      otherDeductions,
      totalDeductions,
      netPay,
      items,
    };
  }

  /** Contratos laborales activos con salario base (candidatos a nómina). */
  eligibleContracts() {
    return this.prisma.workContract.findMany({
      where: { engagementType: "employee", status: "activo", monthlySalary: { not: null } },
      orderBy: { startDate: "desc" },
      include: {
        quicker: { select: { id: true, name: true, zone: true } },
        client: { select: { id: true, name: true } },
      },
    });
  }

  private async loadEmployeeContract(contractId: string) {
    const contract = await this.prisma.workContract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }
    if (contract.engagementType !== "employee") {
      throw new BadRequestException("Solo los contratos laborales (employee) liquidan nómina");
    }
    if (contract.monthlySalary == null) {
      throw new BadRequestException("El contrato no tiene salario base definido");
    }
    return contract as typeof contract & { monthlySalary: number };
  }

  async preview(contractId: string, from: Date, to: Date, extras: PayrollExtra[]) {
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException("El fin del período no puede ser anterior al inicio");
    }
    const contract = await this.loadEmployeeContract(contractId);
    return this.compute(contract.monthlySalary, from, to, extras);
  }

  async run(contractId: string, from: Date, to: Date, extras: PayrollExtra[], actorId: string) {
    const breakdown = await this.preview(contractId, from, to, extras);
    const contract = await this.loadEmployeeContract(contractId);

    const dup = await this.prisma.payrollRun.findFirst({
      where: { contractId, periodFrom: from, periodTo: to },
    });
    if (dup) {
      throw new BadRequestException("Ya existe una nómina para ese contrato y período");
    }

    const run = await this.prisma.payrollRun.create({
      data: {
        contractId,
        quickerId: contract.quickerId,
        periodFrom: from,
        periodTo: to,
        baseSalary: breakdown.baseSalary,
        transportAllowance: breakdown.transportAllowance,
        bonuses: breakdown.bonuses,
        grossEarnings: breakdown.grossEarnings,
        healthDeduction: breakdown.healthDeduction,
        pensionDeduction: breakdown.pensionDeduction,
        otherDeductions: breakdown.otherDeductions,
        totalDeductions: breakdown.totalDeductions,
        netPay: breakdown.netPay,
        items: breakdown.items as unknown as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });

    await this.audit.record({
      action: "payroll.run",
      outcome: "success",
      actorId,
      resourceType: "payroll",
      resourceId: run.id,
      metadata: { contractId, netPay: breakdown.netPay, gross: breakdown.grossEarnings },
    });

    return run;
  }

  async markPaid(id: string, actorId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) {
      throw new NotFoundException("Nómina no encontrada");
    }
    if (run.status === "pagada") {
      throw new BadRequestException("La nómina ya está pagada");
    }
    const updated = await this.prisma.payrollRun.update({
      where: { id },
      data: { status: "pagada", paidAt: new Date() },
    });
    await this.audit.record({
      action: "payroll.pay",
      outcome: "success",
      actorId,
      resourceType: "payroll",
      resourceId: id,
      metadata: { netPay: run.netPay },
    });
    return updated;
  }

  history() {
    return this.prisma.payrollRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contract: {
          select: {
            position: true,
            quicker: { select: { name: true, zone: true } },
            client: { select: { name: true } },
          },
        },
      },
    });
  }
}
