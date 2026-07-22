import { Request, Response, NextFunction } from 'express';
import * as peopleService from '../services/people.service';
import { peopleToExcel, peopleToCSV, parsePeopleExcel } from '../utils/excel';
import { parsePeopleCSV } from '../utils/csv';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

function countByLabel<T>(items: T[], picker: (item: T) => string | null | undefined) {
  const map = new Map<string, number>();
  items.forEach(item => {
    const label = picker(item);
    if (!label) return;
    const key = label.toString().trim();
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export async function bulkDeletePeople(req: Request, res: Response, next: NextFunction) {
  try {
    const idsRaw = (req.body?.ids || []) as any[];
    const ids = Array.isArray(idsRaw) ? idsRaw.map(id => Number(id)).filter(n => Number.isInteger(n) && n > 0) : [];
    if (!ids.length) return res.status(400).json({ message: 'ids array is required' });
    const result = await peopleService.deletePeople(ids);
    res.json({ message: 'Bulk delete complete', count: result.count });
  } catch (err) {
    next(err);
  }
}

function coerceDate(value: any) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  // Excel serial number (days since 1899-12-30)
  if (typeof value === 'number' && !Number.isNaN(value)) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(base.getTime() + value * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();

    // Numeric string that might be an Excel serial
    if (/^\d+(\.\d+)?$/.test(normalized)) {
      const num = Number(normalized);
      if (!Number.isNaN(num)) {
        const base = new Date(Date.UTC(1899, 11, 30));
        const dt = new Date(base.getTime() + num * 24 * 60 * 60 * 1000);
        if (!Number.isNaN(dt.getTime())) return dt;
      }
    }

    // Compact YYYYMMDD
    const yyyymmdd = normalized.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) {
      const [, y, mth, d] = yyyymmdd;
      const dt = new Date(parseInt(y, 10), parseInt(mth, 10) - 1, parseInt(d, 10));
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    // YYYY-MM-DD (or with / or .)
    const ymd = normalized.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})$/);
    if (ymd) {
      const [, y, mth, d] = ymd;
      const dt = new Date(parseInt(y, 10), parseInt(mth, 10) - 1, parseInt(d, 10));
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    // DD-MM-YYYY or DD/MM/YY or DD.MM.YYYY
    const dmy = normalized.match(/^(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{2,4})$/);
    if (dmy) {
      const [, d, mth, y] = dmy;
      const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
      const dt = new Date(year, parseInt(mth, 10) - 1, parseInt(d, 10));
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    // MM-DD-YYYY
    const mdy = normalized.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})$/);
    if (mdy) {
      const [, mth, d, y] = mdy;
      const dt = new Date(parseInt(y, 10), parseInt(mth, 10) - 1, parseInt(d, 10));
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    // Month name formats
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) return new Date(parsed);

    // Last resort: pull first three numeric parts and try common orders
    const parts = normalized.match(/(\d{1,4})/g);
    if (parts && parts.length >= 3) {
      const [a, b, c] = parts.slice(0, 3).map(p => parseInt(p, 10));
      const candidates = [
        { y: a, m: b, d: c }, // y-m-d or y/d/m depending on ranges
        { y: c, m: b, d: a }, // d-m-y
        { y: c, m: a, d: b }, // m-d-y
      ];
      for (const cand of candidates) {
        if (!cand || Number.isNaN(cand.y) || Number.isNaN(cand.m) || Number.isNaN(cand.d)) continue;
        const year = cand.y < 100 ? (cand.y > 30 ? 1900 + cand.y : 2000 + cand.y) : cand.y;
        const dt = new Date(year, cand.m - 1, cand.d);
        if (!Number.isNaN(dt.getTime())) return dt;
      }
    }
  }

  return null;
}

function validatePersonRow(row: any) {
  const required = ['firstName', 'lastName', 'location', 'qualification', 'bloodGroup', 'dateOfBirth'];
  for (const key of required) {
    if (!row[key]) return `${key} is required`;
  }
  const dob = coerceDate(row.dateOfBirth);
  if (!dob) return 'dateOfBirth is invalid';
  return null;
}

function normalizePersonRow(p: any) {
  const trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
  const stringOrUndefined = (v: any) => {
    if (v === null || v === undefined) return undefined;
    const str = typeof v === 'string' ? v.trim() : String(v).trim();
    if (str === '' || str === '-') return undefined;
    return str;
  };
  const mapGender = (v: any) => {
    const s = trim(v)?.toString().trim().toLowerCase();
    if (!s || s === '-') return undefined;
    if (['m', 'male', 'man', 'boy'].includes(s)) return 'Male';
    if (['f', 'female', 'woman', 'girl'].includes(s)) return 'Female';
    if (['o', 'other', 'others', 'non-binary', 'nonbinary', 'nb'].includes(s)) return 'Other';
    return trim(v) || undefined;
  };
  const cleanDate = (v: any) => {
    if (v === '-' || v === '' || v === null || v === undefined) return undefined;
    return v;
  };
   const toBool = (v: any) => {
    if (v === true) return true;
    if (v === false) return false;
    const s = trim(v)?.toLowerCase();
    if (!s) return undefined;
    if (['1', 'true', 'yes', 'y'].includes(s)) return true;
    if (['0', 'false', 'no', 'n'].includes(s)) return false;
    return undefined;
  };
  // Skip obvious header rows mistakenly parsed as data
  const first = trim(p.firstName)?.toLowerCase();
  const last = trim(p.lastName)?.toLowerCase();
  const loc = trim(p.location)?.toLowerCase();
  const qual = trim(p.qualification)?.toLowerCase();
  const bg = trim(p.bloodGroup)?.toLowerCase();
  const dob = trim(p.dateOfBirth)?.toLowerCase();
  const isHeaderRow =
    ['full name', 'name (head of family as per connect nanabhadia telephone directory)'].includes(first || '') &&
    ['surname', 'title', 'last name'].includes(last || '') &&
    ['residing city', 'residing area', 'location'].includes(loc || '') &&
    ['education', 'stream / field', 'qualification'].includes(qual || '') &&
    (bg === 'blood group' || bg === 'bloodgroup') &&
    dob === 'date of birth';
  if (isHeaderRow) return null;
  return {
    firstName: trim(p.firstName),
    middleName: trim(p.middleName) || undefined,
    lastName: trim(p.lastName),
    location: trim(p.location) || 'Unknown',
    qualification: trim(p.qualification) || 'Not Provided',
    bloodGroup: trim(p.bloodGroup),
    dateOfBirth: cleanDate(p.dateOfBirth),
    title: trim(p.title) || undefined,
    sampraday: trim(p.sampraday) || undefined,
    email: trim(p.email) || undefined,
    mobile: stringOrUndefined(p.mobile),
    altMobile: stringOrUndefined(p.altMobile),
    isCareOf: toBool(p.isCareOf),
    gender: mapGender(p.gender),
    maritalStatus: trim(p.maritalStatus) || undefined,
    anniversary: cleanDate(p.anniversary),
    relation: trim(p.relation) || undefined,
    educationLevel: trim(p.educationLevel) || undefined,
    educationStream: trim(p.educationStream) || undefined,
    educationDetails: trim(p.educationDetails) || undefined,
    profession: trim(p.profession) || undefined,
    businessName: trim(p.businessName) || undefined,
    industry: trim(p.industry) || undefined,
    professionalTitle: trim(p.professionalTitle) || undefined,
    professionalTitleOther: trim(p.professionalTitleOther) || undefined,
    professionalTitleDesc: trim(p.professionalTitleDesc) || undefined,
    officeAddress: trim(p.officeAddress) || undefined,
    achievements: trim(p.achievements) || undefined,
    hobbies: trim(p.hobbies) || undefined,
    interests: trim(p.interests) || undefined,
    addressType: trim(p.addressType) || undefined,
    address: trim(p.address) || undefined,
    residingArea: trim(p.residingArea) || undefined,
    residingCity: trim(p.residingCity) || undefined,
    pincode: trim(p.pincode) || undefined,
    state: trim(p.state) || undefined,
    country: trim(p.country) || undefined,
    citizenship: trim(p.citizenship) || undefined,
    nriCountry: trim(p.nriCountry) || undefined,
    nriAddress: trim(p.nriAddress) || undefined,
    nbHasSerial: stringOrUndefined(p.nbHasSerial),
    nbSerialNumber: stringOrUndefined(p.nbSerialNumber),
    motherName: trim(p.motherName) || undefined,
    fatherHusbandName: trim(p.fatherHusbandName) || undefined,
    grandfatherName: trim(p.grandfatherName) || undefined,
    fario: trim(p.fario) || undefined,
    rationCardColor: trim(p.rationCardColor) || undefined,
    personalMediclaim: trim(p.personalMediclaim) || undefined,
    personalMediclaimType: trim(p.personalMediclaimType) || undefined,
    communityMediclaim: trim(p.communityMediclaim) || undefined,
    profileCreatedBy: trim(p.profileCreatedBy) || undefined,
    profileCreatorName: trim(p.profileCreatorName) || undefined,
    familyHeadId: trim(p.familyHeadId) || undefined,
    wifeMotherVillage: trim(p.wifeMotherVillage) || undefined,
    wifeMotherMaidenName: trim(p.wifeMotherMaidenName) || undefined,
    marriedDaughterVillage: trim(p.marriedDaughterVillage) || undefined,
  };
}

// Export People
export async function exportPeople(req: Request, res: Response, next: NextFunction) {
  try {
    const people = await prisma.person.findMany();
    const format = req.query.format;
    if (format === 'excel') {
      const file = peopleToExcel(people);
      res.setHeader('Content-Disposition', 'attachment; filename=people.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(file);
    } else if (format === 'csv') {
      const file = peopleToCSV(people);
      res.setHeader('Content-Disposition', 'attachment; filename=people.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(file);
    } else {
      res.status(400).json({ message: 'Invalid format' });
    }
  } catch (err) {
    next(err);
  }
}

// Import People (validated, all-or-nothing)
export async function importPeople(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    let people;
    if (req.file.mimetype === 'text/csv') {
      people = parsePeopleCSV(req.file.buffer.toString());
    } else if (
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      req.file.mimetype === 'application/vnd.ms-excel'
    ) {
      people = parsePeopleExcel(req.file.buffer);
    } else {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    people = people
      .map(normalizePersonRow)
      .filter((p: any) => p && p.firstName && p.lastName && p.bloodGroup && p.dateOfBirth);

    const invalid: { index: number; error: string; rawDate?: any; raw?: any }[] = [];
    people.forEach((p: any, idx: number) => {
      const err = validatePersonRow(p);
      if (err) invalid.push({ index: idx + 1, error: err, rawDate: p.dateOfBirth, raw: p });
    });

    if (invalid.length) {
      return res.status(400).json({ message: 'Validation failed', invalid });
    }

    await prisma.$transaction(async tx => {
      for (const p of people) {
        const dob = coerceDate(p.dateOfBirth) as Date;
        const ann = p.anniversary ? (coerceDate(p.anniversary) as Date) : undefined;
        const existing = await tx.person.findFirst({ where: { firstName: p.firstName, lastName: p.lastName, dateOfBirth: dob } });
        if (existing) {
          await tx.person.update({ where: { id: existing.id }, data: { ...p, dateOfBirth: dob, anniversary: ann } });
        } else {
          await tx.person.create({ data: { ...p, dateOfBirth: dob, anniversary: ann } });
        }
      }
    });

    res.json({ message: 'Import successful', count: people.length });
  } catch (err) {
    next(err);
  }
}

export async function getFamilyDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });

    const person = await prisma.person.findUnique({ where: { id } });
    if (!person) return res.status(404).json({ message: 'Person not found' });

    const familyKeyRaw = (person.nbSerialNumber || person.familyHeadId || '').trim();
    const familyKey = familyKeyRaw || null;

    let members = familyKey
      ? await prisma.person.findMany({
          where: {
            OR: [
              { nbSerialNumber: familyKey },
              { familyHeadId: familyKey },
            ],
          },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        })
      : [person];

    // Ensure uniqueness in case both fields matched
    const seen = new Set<number>();
    members = members.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    const stats = {
      total: members.length,
      gender: countByLabel(members, m => (m.gender ? m.gender : 'Unknown')),
      bloodGroups: countByLabel(members, m => m.bloodGroup),
      maritalStatus: countByLabel(members, m => m.maritalStatus || 'Not set'),
      qualifications: countByLabel(members, m => m.qualification),
      locations: countByLabel(members, m => m.location),
      ageBuckets: ageBuckets(members.map(m => m.dateOfBirth)),
    };

    res.json({ person, familyKey, members, stats });
  } catch (err) {
    next(err);
  }
}

export async function createPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = { ...req.body };
    if (payload.dateOfBirth) {
      const dob = coerceDate(payload.dateOfBirth);
      if (!dob) return res.status(400).json({ message: 'dateOfBirth is invalid' });
      payload.dateOfBirth = dob;
    }
    if (payload.anniversary) {
      const ann = coerceDate(payload.anniversary);
      if (!ann) return res.status(400).json({ message: 'anniversary is invalid' });
      payload.anniversary = ann;
    }
    const person = await peopleService.createPerson(payload as any);
    res.status(201).json(person);
  } catch (err) {
    next(err);
  }
}

export async function updatePerson(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.dateOfBirth) {
      const dob = coerceDate(payload.dateOfBirth);
      if (!dob) return res.status(400).json({ message: 'dateOfBirth is invalid' });
      payload.dateOfBirth = dob;
    }
    if (payload.anniversary) {
      const ann = coerceDate(payload.anniversary);
      if (!ann) return res.status(400).json({ message: 'anniversary is invalid' });
      payload.anniversary = ann;
    }
    const person = await peopleService.updatePerson(Number(id), payload as any);
    res.json(person);
  } catch (err) {
    next(err);
  }
}

export async function deletePerson(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await peopleService.deletePerson(Number(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const person = await peopleService.getPerson(Number(id));
    res.json(person);
  } catch (err) {
    next(err);
  }
}

export async function listPeople(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await peopleService.listPeople(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
