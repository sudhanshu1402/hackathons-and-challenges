import { PrismaClient, Prisma } from '@prisma/client';
import { groupBy } from 'lodash';

const prisma = new PrismaClient();

type Filters = {
  search?: string;
  location?: string;
  qualification?: string;
  bloodGroup?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
};

function yearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

function buildWhere(filters: Filters): Prisma.PersonWhereInput {
  const where: Prisma.PersonWhereInput = {};

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { firstName: { contains: term, mode: 'insensitive' } },
      { middleName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  if (filters.qualification) {
    where.qualification = { contains: filters.qualification, mode: 'insensitive' };
  }

  if (filters.bloodGroup) {
    where.bloodGroup = filters.bloodGroup;
  }

  if (filters.gender) {
    where.gender = { equals: filters.gender, mode: 'insensitive' } as any;
  }

  if (filters.minAge || filters.maxAge) {
    const dob: Prisma.DateTimeFilter = {};
    if (filters.minAge) dob.lte = yearsAgo(filters.minAge);
    if (filters.maxAge) dob.gte = yearsAgo(filters.maxAge);
    where.dateOfBirth = dob;
  }

  return where;
}

function toCountMap(rows: { [key: string]: any; _count: { _all: number } }[], key: string) {
  return rows
    .filter(r => r[key] !== null && r[key] !== undefined && r[key] !== '')
    .map(r => ({ label: String(r[key]), count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

function ageBuckets(dobs: Date[]) {
  const now = new Date();
  const buckets: Record<string, number> = {
    '0-17': 0,
    '18-29': 0,
    '30-44': 0,
    '45-59': 0,
    '60+': 0,
  };

  dobs.forEach(d => {
    const age = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    if (age < 18) buckets['0-17'] += 1;
    else if (age < 30) buckets['18-29'] += 1;
    else if (age < 45) buckets['30-44'] += 1;
    else if (age < 60) buckets['45-59'] += 1;
    else buckets['60+'] += 1;
  });

  return Object.entries(buckets).map(([label, count]) => ({ label, count }));
}

export async function alphabeticalList() {
  return prisma.person.findMany({ orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
}

export async function groupByAge() {
  const people = await prisma.person.findMany();
  const now = new Date();
  return groupBy(people, person => {
    const age = now.getFullYear() - person.dateOfBirth.getFullYear();
    if (age < 18) return 'Under 18';
    if (age < 30) return '18-29';
    if (age < 50) return '30-49';
    return '50+';
  });
}

export async function groupByQualification() {
  const people = await prisma.person.findMany();
  return groupBy(people, 'qualification');
}

export async function groupByLocation() {
  const people = await prisma.person.findMany();
  return groupBy(people, 'location');
}

function topFamilies(people: { id: number; firstName: string; lastName: string; nbSerialNumber: string | null }[]) {
  const map = new Map<string, { key: string; members: { id: number; name: string }[] }>();
  people.forEach(p => {
    if (!p.nbSerialNumber) return;
    const key = p.nbSerialNumber.trim();
    if (!key) return;
    const entry = map.get(key) || { key, members: [] };
    entry.members.push({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim() });
    map.set(key, entry);
  });
  return Array.from(map.values())
    .map(f => ({ key: f.key, size: f.members.length, members: f.members }))
    .sort((a, b) => b.size - a.size);
}

export async function overview(filters: Filters) {
  const where = buildWhere(filters);

  const [
    total,
    gender,
    bloodGroups,
    qualifications,
    locations,
    marital,
    professions,
    sampraday,
    familiesSource,
    dobs,
  ] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.groupBy({ by: ['gender'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['bloodGroup'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['qualification'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['location'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['maritalStatus'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['profession'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['sampraday'], _count: { _all: true }, where }),
    prisma.person.findMany({ where, select: { id: true, firstName: true, lastName: true, nbSerialNumber: true } }),
    prisma.person.findMany({ where, select: { dateOfBirth: true } }),
  ]);

  const genderCounts = gender.reduce<Record<string, number>>((acc, g) => {
    const key = g.gender?.toLowerCase() || 'unknown';
    acc[key] = g._count._all;
    return acc;
  }, {});

  return {
    total,
    gender: genderCounts,
    ageBuckets: ageBuckets(dobs.map(d => d.dateOfBirth)),
    bloodGroups: toCountMap(bloodGroups, 'bloodGroup'),
    locations: toCountMap(locations, 'location'),
    qualifications: toCountMap(qualifications, 'qualification'),
    maritalStatus: toCountMap(marital, 'maritalStatus'),
    professions: toCountMap(professions, 'profession'),
    sampraday: toCountMap(sampraday, 'sampraday'),
    families: topFamilies(familiesSource).slice(0, 8),
  };
}

export async function overview(filters: Filters) {
  const where = buildWhere(filters);

  const [
    total,
    gender,
    bloodGroups,
    qualifications,
    locations,
    marital,
    dobs,
  ] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.groupBy({ by: ['gender'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['bloodGroup'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['qualification'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['location'], _count: { _all: true }, where }),
    prisma.person.groupBy({ by: ['maritalStatus'], _count: { _all: true }, where }),
    prisma.person.findMany({ where, select: { dateOfBirth: true } }),
  ]);

  const genderCounts = gender.reduce<Record<string, number>>((acc, g) => {
    const key = g.gender?.toLowerCase() || 'unknown';
    acc[key] = g._count._all;
    return acc;
  }, {});

  return {
    total,
    gender: genderCounts,
    ageBuckets: ageBuckets(dobs.map(d => d.dateOfBirth)),
    bloodGroups: toCountMap(bloodGroups, 'bloodGroup'),
    locations: toCountMap(locations, 'location'),
    qualifications: toCountMap(qualifications, 'qualification'),
    maritalStatus: toCountMap(marital, 'maritalStatus'),
  };
}
