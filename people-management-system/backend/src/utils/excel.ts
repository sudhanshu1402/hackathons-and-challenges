import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Person } from '@prisma/client';

function mapBloodGroup(value: any): string {
	const bg = (value ?? '').toString().trim().toUpperCase();
	const numericMap: Record<string, string> = {
		'1': 'A+',
		'2': 'B+',
		'3': 'O+',
		'4': 'AB+',
		'5': 'A-',
		'6': 'B-',
		'7': 'O-',
		'8': 'AB-',
	};
	return numericMap[bg] || bg;
}

export function peopleToExcel(people: Person[]): Buffer {
	const data = people.map(p => ({
		ID: p.id,
		Title: p.title || '',
		'First Name': p.firstName,
		'Middle Name': p.middleName || '',
		'Last Name': p.lastName,
		Sampraday: p.sampraday || '',
		Email: p.email || '',
		Mobile: p.mobile || '',
		'Alternate Mobile': p.altMobile || '',
		'Is Care Of': p.isCareOf ?? '',
		Gender: p.gender || '',
		'Location / Residing City': p.residingCity || p.location,
		'Qualification Level': p.educationLevel || '',
		'Qualification': p.qualification,
		'Stream / Field': p.educationStream || '',
		'Qualification Details': p.educationDetails || '',
		Profession: p.profession || '',
		'Business / Company Name': p.businessName || '',
		Industry: p.industry || '',
		'Professional Title': p.professionalTitle || '',
		'Other Professional Title': p.professionalTitleOther || '',
		'Professional Title Description': p.professionalTitleDesc || '',
		'Office Address': p.officeAddress || '',
		'Blood Group': p.bloodGroup,
		'Date of Birth': p.dateOfBirth.toISOString().slice(0, 10),
		Marital: p.maritalStatus || '',
		Anniversary: p.anniversary ? p.anniversary.toISOString().slice(0, 10) : '',
		Relation: p.relation || '',
		'Address Type': p.addressType || '',
		Address: p.address || '',
		'Residing Area': p.residingArea || '',
		'Residing City': p.residingCity || '',
		Pincode: p.pincode || '',
		State: p.state || '',
		Country: p.country || '',
		Citizenship: p.citizenship || '',
		'NRI Country': p.nriCountry || '',
		'NRI Address': p.nriAddress || '',
		Achievements: p.achievements || '',
		Hobbies: p.hobbies || '',
		Interests: p.interests || '',
		'Have Connect Serial': p.nbHasSerial || '',
		'Connect Serial Number': p.nbSerialNumber || '',
		'Mother Name': p.motherName || '',
		'Father/Husband Name': p.fatherHusbandName || '',
		'Grandfather Name': p.grandfatherName || '',
		Fario: p.fario || '',
		'Ration Card Color': p.rationCardColor || '',
		'Personal Mediclaim': p.personalMediclaim || '',
		'Personal Mediclaim Type': p.personalMediclaimType || '',
		'Community Mediclaim': p.communityMediclaim || '',
		'Profile Created By': p.profileCreatedBy || '',
		'Profile Creator Name': p.profileCreatorName || '',
		'Head ID': p.familyHeadId || '',
		'Wife/Mother Village': p.wifeMotherVillage || '',
		'Wife/Mother Maiden Name': p.wifeMotherMaidenName || '',
		'Married Daughter Village': p.marriedDaughterVillage || '',
	}));
	const ws = XLSX.utils.json_to_sheet(data);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'People');
	return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function peopleToCSV(people: Person[]): string {
	const data = people.map(p => ({
		id: p.id,
		title: p.title || '',
		firstName: p.firstName,
		middleName: p.middleName || '',
		lastName: p.lastName,
		sampraday: p.sampraday || '',
		email: p.email || '',
		mobile: p.mobile || '',
		altMobile: p.altMobile || '',
		isCareOf: p.isCareOf ?? '',
		gender: p.gender || '',
		location: p.residingCity || p.location,
		qualificationLevel: p.educationLevel || '',
		qualification: p.qualification,
		educationStream: p.educationStream || '',
		educationDetails: p.educationDetails || '',
		profession: p.profession || '',
		businessName: p.businessName || '',
		industry: p.industry || '',
		professionalTitle: p.professionalTitle || '',
		professionalTitleOther: p.professionalTitleOther || '',
		professionalTitleDesc: p.professionalTitleDesc || '',
		officeAddress: p.officeAddress || '',
		bloodGroup: p.bloodGroup,
		dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
		maritalStatus: p.maritalStatus || '',
		anniversary: p.anniversary ? p.anniversary.toISOString().slice(0, 10) : '',
		relation: p.relation || '',
		addressType: p.addressType || '',
		address: p.address || '',
		residingArea: p.residingArea || '',
		residingCity: p.residingCity || '',
		pincode: p.pincode || '',
		state: p.state || '',
		country: p.country || '',
		citizenship: p.citizenship || '',
		nriCountry: p.nriCountry || '',
		nriAddress: p.nriAddress || '',
		achievements: p.achievements || '',
		hobbies: p.hobbies || '',
		interests: p.interests || '',
		nbHasSerial: p.nbHasSerial || '',
		nbSerialNumber: p.nbSerialNumber || '',
		motherName: p.motherName || '',
		fatherHusbandName: p.fatherHusbandName || '',
		grandfatherName: p.grandfatherName || '',
		fario: p.fario || '',
		rationCardColor: p.rationCardColor || '',
		personalMediclaim: p.personalMediclaim || '',
		personalMediclaimType: p.personalMediclaimType || '',
		communityMediclaim: p.communityMediclaim || '',
		profileCreatedBy: p.profileCreatedBy || '',
		profileCreatorName: p.profileCreatorName || '',
		familyHeadId: p.familyHeadId || '',
		wifeMotherVillage: p.wifeMotherVillage || '',
		wifeMotherMaidenName: p.wifeMotherMaidenName || '',
		marriedDaughterVillage: p.marriedDaughterVillage || '',
	}));

	const headers = [
		'id',
		'title',
		'firstName',
		'middleName',
		'lastName',
		'sampraday',
		'email',
		'mobile',
		'altMobile',
		'isCareOf',
		'gender',
		'location',
		'qualificationLevel',
		'qualification',
		'educationStream',
		'educationDetails',
		'profession',
		'businessName',
		'industry',
		'professionalTitle',
		'professionalTitleOther',
		'professionalTitleDesc',
		'officeAddress',
		'bloodGroup',
		'dateOfBirth',
		'maritalStatus',
		'anniversary',
		'relation',
		'addressType',
		'address',
		'residingArea',
		'residingCity',
		'pincode',
		'state',
		'country',
		'citizenship',
		'nriCountry',
		'nriAddress',
		'achievements',
		'hobbies',
		'interests',
		'nbHasSerial',
		'nbSerialNumber',
		'motherName',
		'fatherHusbandName',
		'grandfatherName',
		'fario',
		'rationCardColor',
		'personalMediclaim',
		'personalMediclaimType',
		'communityMediclaim',
		'profileCreatedBy',
		'profileCreatorName',
		'familyHeadId',
		'wifeMotherVillage',
		'wifeMotherMaidenName',
		'marriedDaughterVillage',
	];
	if (!data.length) return headers.join(',');

	const rows = data.map(row => headers.map(key => (row as any)[key]).join(','));
	return [headers.join(','), ...rows].join('\n');
}

export function peopleToPDF(people: Person[]): Buffer {
	const doc = new PDFDocument({ margin: 30, size: 'A4' });
	const buffers: Buffer[] = [];
	doc.on('data', buffers.push.bind(buffers));
	doc.fontSize(16).text('People Report', { align: 'center' });
	doc.moveDown();
	people.forEach(p => {
		doc.fontSize(12).text(
			`${p.firstName} ${p.middleName || ''} ${p.lastName} | ${p.location} | ${p.qualification} | ${p.bloodGroup} | ${p.dateOfBirth.toISOString().slice(0, 10)}`
		);
	});
	doc.end();
	return Buffer.concat(buffers);
}

function pickValue(row: any, candidates: string[]): any {
	const entries = Object.entries(row || {}).map(([k, v]) => [k.toString().trim().toLowerCase(), v] as const);
	for (const key of candidates) {
		const hit = entries.find(([k]) => k === key.trim().toLowerCase());
		if (hit) return hit[1];
	}
	for (const key of candidates) {
		const hit = entries.find(([k]) => k.includes(key.trim().toLowerCase()));
		if (hit) return hit[1];
	}
	return undefined;
}

function normalizeLegacyRow(row: any) {
	// Map using provided legacy headers
	const lastNameRaw = pickValue(row, ['Surname', 'Last Name']);
	const firstNameRaw = pickValue(row, [
		'Name (Head of family as per Connect Nanabhadia Telephone Directory)',
		'Full Name',
		'First Name',
	]);
	const locationRaw = pickValue(row, ['Residing City', 'Residing Area', 'Location']);
	const qualificationRaw = pickValue(row, ['Education', 'Stream / Field', 'Qualification']);
	const bloodGroupRaw = pickValue(row, ['Blood Group']);
	const dobRaw = pickValue(row, ['Date of Birth', 'DOB']);

	const trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
	const firstName = trim(firstNameRaw) || '';
	const lastName = trim(lastNameRaw) || '';
	const location = trim(locationRaw) || '';
	const qualification = trim(qualificationRaw) || '';
	const bloodGroup = trim(bloodGroupRaw) || '';
	const dateOfBirth = dobRaw;

	if (firstName && lastName && location && qualification && bloodGroup && dateOfBirth) {
		return {
			firstName,
			middleName: trim(pickValue(row, ['Middle Name'])) || undefined,
			lastName,
			location,
			qualification,
			bloodGroup,
			dateOfBirth,
		};
	}

	// Family member section: Full Name + Family Head columns
	const memberFullNameRaw = pickValue(row, ['Full Name']);
	const memberHeadRaw = pickValue(row, ['Family Head']);
	const memberLocationRaw = pickValue(row, ['Residing City', 'Residing Area']);
	const memberQualificationRaw = pickValue(row, ['Education', 'Stream / Field']);
	const memberBloodGroupRaw = pickValue(row, ['Blood Group']);
	const memberDobRaw = pickValue(row, ['Date of Birth', 'DOB']);
	const memberFullName = trim(memberFullNameRaw) || '';
	const memberBloodGroup = trim(memberBloodGroupRaw) || '';
	const memberLocation = trim(memberLocationRaw) || '';
	const memberQualification = trim(memberQualificationRaw) || '';

	if (memberFullName && memberBloodGroup && memberDobRaw) {
		const parts = memberFullName.split(' ').filter(Boolean);
		const first = parts[0];
		const last = parts.length > 1 ? parts[parts.length - 1] : (trim(memberHeadRaw) as string) || 'Unknown';
		return {
			firstName: first,
			middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined,
			lastName: last,
			location: memberLocation || 'Unknown',
			qualification: memberQualification || 'Not Provided',
			bloodGroup: memberBloodGroup,
			dateOfBirth: memberDobRaw,
		};
	}

	return null;
}

export function parsePeopleExcel(buffer: Buffer) {
	const wb = XLSX.read(buffer, { type: 'buffer' });
	const ws = wb.Sheets[wb.SheetNames[0]];
	const data = XLSX.utils.sheet_to_json(ws);
	return (data as any[])
		.map(row => {
			// First try legacy mapping
			const legacy = normalizeLegacyRow(row);
			if (legacy) return legacy;
			// Fallback to our standard headers
			return {
				firstName:
					row['First Name'] ||
					row['Name (Head of family as per Connect Nanabhadia Telephone Directory)'] ||
					row['Full Name'],
				middleName: row['Middle Name'] || undefined,
				lastName: row['Last Name'] || row['Surname'],
				location: row['Location'] || row['Residing City'] || row['Residing Area'],
				qualification: row['Qualification'] || row['Education'],
				bloodGroup: mapBloodGroup(row['Blood Group']),
				dateOfBirth: row['Date of Birth'] || row['DOB'],
				title: row['Title'],
				sampraday: row['Sampraday'],
				email: row['Email'],
				mobile: row['Mobile'],
				altMobile: row['Alternate Mobile'] || row['Alt Mobile'],
				isCareOf: row['Is Care Of'] || row['Care Of'],
				gender: pickValue(row, ['Gender', 'Gender (Male/Female/Other)', 'gender', 'Sex']),
				maritalStatus: row['Marital Status'],
				anniversary: row['Anniversary'] || row['Marriage Anniversary'],
				relation: row['Relation'] || row['Relation with Family Head'],
				educationLevel: row['Education Level'] || row['Education'],
				educationStream: row['Education Stream'] || row['Stream / Field'],
				educationDetails: row['Education Details'] || row['Additional Details'],
				profession: row['Profession'],
				businessName: row['Business Name'] || row['Business / Company Name'],
				industry: row['Industry'],
				professionalTitle: row['Professional Title'],
				professionalTitleOther: row['Other Professional Title'],
				professionalTitleDesc: row['Professional Title Description'],
				officeAddress: row['Office Address'],
				achievements: row['Achievements'] || row['Educational or Professional Achievements'],
				hobbies: row['Hobbies'],
				interests: row['Interests'],
				addressType: row['Address Type'],
				address: row['Address'] || row['Permanent Address'],
				residingArea: row['Residing Area'],
				residingCity: row['Residing City'],
				pincode: row['Pincode'],
				state: row['State'],
				country: row['Country'],
				citizenship: row['Citizenship'],
				nriCountry: row['NRI Country'],
				nriAddress: row['NRI Address'],
				nbHasSerial:
					row['Have Connect Serial'] ||
					row['Do you have Connect Nana Bhadia Telephone Directory Serial No.?'] ||
					row['Has Connect Nana Bhadia Telephone Directory Serial No.?'],
				nbSerialNumber: row['Connect Serial Number'] || row['Nana Bhadia Connect Serial Number'],
				motherName: row['Mother Name'] || row["Mother's Name"],
				fatherHusbandName: row['Father/Husband Name'] || row["Father's Name / Husband's Name"],
				grandfatherName: row['Grandfather Name'],
				fario: row['Fario'],
				rationCardColor: row['Ration Card Color'] || row['Ration Card'],
				personalMediclaim: row['Personal Mediclaim'] || row['Do you have Personal Mediclaim?'],
				personalMediclaimType: row['Personal Mediclaim Type'] || row['Type of Personal Mediclaim'],
				communityMediclaim: row['Community Mediclaim'] || row['Do you have Community Mediclaim?'],
				profileCreatedBy: row['Profile Created By'] || row['Profile created by'],
				profileCreatorName: row['Profile Creator Name'] || row['Full Name of the person creating the profile'],
				familyHeadId: row['Head ID'] || row['head_id'] || row['Family Head'],
				wifeMotherVillage: row['Wife/Mother Village'] || row['Village'],
				wifeMotherMaidenName: row['Wife/Mother Maiden Name'] || row['Full Maiden Name'] || row['Mother / Wife Full Maiden Name'],
				marriedDaughterVillage: row['Married Daughter Village'] || row['Village Name of Married Daughter'],
			};
		})
		// Drop empty/unmappable rows
		.filter(p => p.firstName || p.lastName || p.location);
}
