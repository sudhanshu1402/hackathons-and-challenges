import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createPerson(data: Prisma.PersonCreateInput) {
  return prisma.person.create({ data });
}

export async function updatePerson(id: number, data: Prisma.PersonUpdateInput) {
  return prisma.person.update({ where: { id }, data });
}

export async function deletePerson(id: number) {
  return prisma.person.delete({ where: { id } });
}

export async function deletePeople(ids: number[]) {
  return prisma.person.deleteMany({ where: { id: { in: ids } } });
}

export async function getPerson(id: number) {
  return prisma.person.findUnique({ where: { id } });
}

export async function listPeople(filters: {
  search?: string;
  location?: string;
  qualification?: string;
  bloodGroup?: string;
  minAge?: string;
  maxAge?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const where: any = {};

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { middleName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
  if (filters.qualification) where.qualification = { contains: filters.qualification, mode: 'insensitive' };
  if (filters.bloodGroup) where.bloodGroup = filters.bloodGroup;

  if (filters.minAge || filters.maxAge) {
    const today = new Date();
    const minAge = filters.minAge ? parseInt(filters.minAge, 10) : undefined;
    const maxAge = filters.maxAge ? parseInt(filters.maxAge, 10) : undefined;
    const dobRange: any = {};

    if (!Number.isNaN(minAge as number) && minAge !== undefined) {
      const maxDob = new Date(today);
      maxDob.setFullYear(today.getFullYear() - minAge);
      dobRange.lte = maxDob;
    }

    if (!Number.isNaN(maxAge as number) && maxAge !== undefined) {
      const minDob = new Date(today);
      minDob.setFullYear(today.getFullYear() - (maxAge + 1));
      dobRange.gte = minDob;
    }

    where.dateOfBirth = dobRange;
  }
  const page = Math.max(parseInt(filters.page || '1', 10) || 1, 1);
  const limitRaw = parseInt(filters.limit || '25', 10);
  const limit = Math.min(Math.max(limitRaw || 25, 1), 200);
  const skip = (page - 1) * limit;

  const sortable: Record<string, keyof Prisma.PersonOrderByWithRelationInput> = {
    lastName: 'lastName',
    firstName: 'firstName',
    dateOfBirth: 'dateOfBirth',
    createdAt: 'createdAt',
  };
  const sortBy = sortable[filters.sortBy || 'lastName'] || 'lastName';
  const sortOrder = (filters.sortOrder === 'desc' ? 'desc' : 'asc') as Prisma.SortOrder;

  const [total, data] = await prisma.$transaction([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder }, { firstName: 'asc' }],
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return { data, page, limit, total, totalPages };
}
