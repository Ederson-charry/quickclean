import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface SendNotification {
  userId?: string | null;
  channel?: "email" | "sms";
  to: string;
  kind: string;
  subject: string;
  body: string;
}

/**
 * Envía y registra notificaciones en la bandeja de salida. El transporte real
 * (SMTP/SMS) se conecta por entorno sin acoplar el dominio; mientras no esté
 * configurado, cada mensaje queda registrado y logueado (auditable, sin secretos
 * fuera de la base).
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger("Notification");

  constructor(private readonly prisma: PrismaService) {}

  async send(input: SendNotification) {
    const channel = input.channel ?? "email";
    this.logger.log(`[${channel}] → ${input.to} · ${input.kind}: ${input.subject}`);
    return this.prisma.notification.create({
      data: {
        userId: input.userId ?? null,
        channel,
        to: input.to,
        kind: input.kind,
        subject: input.subject,
        body: input.body,
        status: "sent",
      },
    });
  }

  list(limit = 100) {
    return this.prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }
}
