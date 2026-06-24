import { Injectable, NotFoundException } from "@nestjs/common";
import type { ServiceCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateCategoryInput } from "./catalog.schemas";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Categorías vigentes (no archivadas), ordenadas para la UI. */
  listActive(): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: { archivedAt: null, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  /** Todas, incluidas archivadas (panel admin). */
  listAll(): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }

  create(input: CreateCategoryInput): Promise<ServiceCategory> {
    return this.prisma.serviceCategory.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        iconName: input.iconName,
        colorToken: input.colorToken,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  /** Archiva (no borra: las tarifas/históricos la referencian). */
  async archive(id: string): Promise<ServiceCategory> {
    const existing = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Categoría no encontrada");
    }
    return this.prisma.serviceCategory.update({
      where: { id },
      data: { archivedAt: new Date(), active: false },
    });
  }
}
