import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { peopleToExcel, peopleToPDF } from '../utils/excel';

function sendFormat(req: Request, res: Response, data: any[], filename: string) {
  if (req.query.format === 'excel') {
    const file = peopleToExcel(data);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(file);
    return true;
  }
  if (req.query.format === 'pdf') {
    const file = peopleToPDF(data);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(file);
    return true;
  }
  return false;
}

export async function alphabeticalList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportService.alphabeticalList();
    if (sendFormat(req, res, data, 'alphabetical')) return;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function groupByAge(req: Request, res: Response, next: NextFunction) {
  try {
    const grouped = await reportService.groupByAge();
    if (req.query.format) {
      const flattened = Object.entries(grouped).flatMap(([bucket, people]) =>
        (people as any[]).map(p => ({ bucket, ...p }))
      );
      if (sendFormat(req, res, flattened, 'age')) return;
    }
    res.json(grouped);
  } catch (err) {
    next(err);
  }
}

export async function groupByQualification(req: Request, res: Response, next: NextFunction) {
  try {
    const grouped = await reportService.groupByQualification();
    if (req.query.format) {
      const flattened = Object.entries(grouped).flatMap(([bucket, people]) =>
        (people as any[]).map(p => ({ bucket, ...p }))
      );
      if (sendFormat(req, res, flattened, 'qualification')) return;
    }
    res.json(grouped);
  } catch (err) {
    next(err);
  }
}

export async function groupByLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const grouped = await reportService.groupByLocation();
    if (req.query.format) {
      const flattened = Object.entries(grouped).flatMap(([bucket, people]) =>
        (people as any[]).map(p => ({ bucket, ...p }))
      );
      if (sendFormat(req, res, flattened, 'location')) return;
    }
    res.json(grouped);
  } catch (err) {
    next(err);
  }
}

export async function overview(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      search: req.query.search as string | undefined,
      location: req.query.location as string | undefined,
      qualification: req.query.qualification as string | undefined,
      bloodGroup: req.query.bloodGroup as string | undefined,
      gender: req.query.gender as string | undefined,
      minAge: req.query.minAge ? Number(req.query.minAge) : undefined,
      maxAge: req.query.maxAge ? Number(req.query.maxAge) : undefined,
    };

    const data = await reportService.overview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
