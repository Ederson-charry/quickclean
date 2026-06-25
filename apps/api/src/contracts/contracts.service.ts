import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateContractInput } from "./contracts.schemas";

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Todos los contratos con quicker y cliente (activos primero, más recientes arriba). */
  list() {
    return this.prisma.workContract.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: {
        quicker: { select: { id: true, name: true, zone: true } },
        client: { select: { id: true, name: true, kind: true } },
      },
    });
  }

  /** Opciones para el formulario: quickers activos + clientes (empresa primero). */
  async options() {
    const [quickers, clients] = await Promise.all([
      this.prisma.quicker.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, zone: true },
      }),
      this.prisma.client.findMany({
        orderBy: [{ kind: "desc" }, { name: "asc" }],
        select: { id: true, name: true, kind: true, requiresDirectHire: true },
      }),
    ]);
    return { quickers, clients };
  }

  async create(input: CreateContractInput, actorId: string) {
    const quicker = await this.prisma.quicker.findUnique({ where: { id: input.quickerId } });
    if (!quicker) {
      throw new NotFoundException("Quicker no encontrado");
    }
    if (input.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: input.clientId } });
      if (!client) {
        throw new NotFoundException("Cliente no encontrado");
      }
    }

    // Evita duplicar un contrato activo del mismo tipo para el mismo quicker↔cliente.
    const dup = await this.prisma.workContract.findFirst({
      where: {
        quickerId: input.quickerId,
        clientId: input.clientId ?? null,
        engagementType: input.engagementType,
        status: "activo",
      },
    });
    if (dup) {
      throw new BadRequestException("Ya existe un contrato activo equivalente para este quicker");
    }

    const contract = await this.prisma.workContract.create({
      data: {
        quickerId: input.quickerId,
        clientId: input.clientId ?? null,
        engagementType: input.engagementType,
        position: input.position,
        contractKind: input.contractKind,
        monthlySalary: input.engagementType === "employee" ? input.monthlySalary ?? null : null,
        startDate: input.startDate ?? new Date(),
        status: "activo",
      },
    });

    await this.audit.record({
      action: "contract.create",
      outcome: "success",
      actorId,
      resourceType: "contract",
      resourceId: contract.id,
      after: {
        quickerId: contract.quickerId,
        clientId: contract.clientId,
        engagementType: contract.engagementType,
        contractKind: contract.contractKind,
      },
    });

    return contract;
  }

  async finalize(id: string, actorId: string) {
    const contract = await this.prisma.workContract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }
    if (contract.status === "finalizado") {
      throw new BadRequestException("El contrato ya está finalizado");
    }
    const updated = await this.prisma.workContract.update({
      where: { id },
      data: { status: "finalizado", endDate: new Date() },
    });
    await this.audit.record({
      action: "contract.finalize",
      outcome: "success",
      actorId,
      resourceType: "contract",
      resourceId: id,
      before: { status: contract.status },
      after: { status: "finalizado" },
    });
    return updated;
  }
}
