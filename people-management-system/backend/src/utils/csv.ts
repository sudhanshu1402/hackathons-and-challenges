import { parse } from 'csv-parse/sync';

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

function normalizeLegacyRow(row: any) {
	const lastNameRaw = pickValue(row, ['surname', 'last name']);
	const firstNameRaw = pickValue(row, [
		'name (head of family as per connect nanabhadia telephone directory)',
		'full name',
		'first name',
	]);
	const locationRaw = pickValue(row, ['residing city', 'residing area', 'location']);
	const qualificationRaw = pickValue(row, ['education', 'stream / field', 'qualification']);
	const bloodGroupRaw = pickValue(row, ['blood group', 'bloodgroup']);
	const dobRaw = pickValue(row, ['date of birth', 'dob']);

	const trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
	const firstName = trim(firstNameRaw) || '';
	const lastName = trim(lastNameRaw) || '';
	const location = trim(locationRaw) || '';
	const qualification = trim(qualificationRaw) || '';
	const bloodGroup = mapBloodGroup(trim(bloodGroupRaw) || '');
	const dateOfBirth = dobRaw;

	if (firstName && lastName && location && qualification && bloodGroup && dateOfBirth) {
		return {
			firstName,
			middleName: trim(pickValue(row, ['middle name'])) || undefined,
			lastName,
			location,
			qualification,
			bloodGroup,
			dateOfBirth,
		};
	}

	// Family member block
	const memberFullNameRaw = pickValue(row, ['full name']);
	const memberHeadRaw = pickValue(row, ['family head']);
	const memberLocationRaw = pickValue(row, ['residing city', 'residing area', 'location']);
	const memberQualificationRaw = pickValue(row, ['education', 'stream / field', 'qualification']);
	const memberBloodGroupRaw = pickValue(row, ['blood group', 'bloodgroup']);
	const memberDobRaw = pickValue(row, ['date of birth', 'dob']);
	const memberFullName = trim(memberFullNameRaw) || '';
	const memberBloodGroup = mapBloodGroup(trim(memberBloodGroupRaw) || '');
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

export function parsePeopleCSV(csv: string) {
	const records = parse(csv, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
	});
	return records
		.map((row: any) => {
			const legacy = normalizeLegacyRow(row);
			if (legacy) return legacy;
			return {
				firstName:
					row['First Name'] ||
					row.firstName ||
					row['Name (Head of family as per Connect Nanabhadia Telephone Directory)'] ||
					row['Full Name'],
				middleName: row['Middle Name'] || row.middleName || undefined,
				lastName: row['Last Name'] || row.lastName || row['Surname'],
				location: row['Location'] || row.location || row['Residing City'],
				qualification: row['Qualification'] || row.qualification || row['Education'],
				bloodGroup: mapBloodGroup(row['Blood Group'] || row.bloodGroup),
				dateOfBirth: row['Date of Birth'] || row.dateOfBirth || row['DOB'],
				title: row['Title'] || row.title,
				sampraday: row['Sampraday'] || row.sampraday,
				email: row['Email'] || row.email,
				mobile: row['Mobile'] || row.mobile,
				altMobile: row['Alternate Mobile'] || row.alt_mobile || row.altMobile,
				isCareOf: row['Is Care Of'] || row.is_careoff || row.isCareOff,
				gender: row['Gender'] || row.gender,
				maritalStatus: row['Marital Status'] || row.marital_status || row.rstatus,
				anniversary: row['Anniversary'] || row.anniversary || row['Marriage Anniversary'],
				relation: row['Relation'] || row.hrelation || row.relation_with_head,
				educationLevel: row['Education Level'] || row.education,
				educationStream: row['Education Stream'] || row.edu_stream || row['Stream / Field'],
				educationDetails: row['Education Details'] || row.edu_additional_details,
				profession: row['Profession'] || row.profession,
				businessName: row['Business Name'] || row['Business / Company Name'] || row.business_name,
				industry: row['Industry'] || row.btype,
				professionalTitle: row['Professional Title'] || row.professional_title,
				professionalTitleOther: row['Other Professional Title'] || row.other_professional_title,
				professionalTitleDesc: row['Professional Title Description'] || row.ptype,
				officeAddress: row['Office Address'] || row.oaddress,
				achievements: row['Achievements'] || row.educational_achievements || row['Educational or Professional Achievements'],
				hobbies: row['Hobbies'] || row.hobbies,
				interests: row['Interests'] || row.interests,
				addressType: row['Address Type'] || row.address_type,
				address: row['Address'] || row.address,
				residingArea: row['Residing Area'] || row.ra,
				residingCity: row['Residing City'] || row.rc || row.location,
				pincode: row['Pincode'] || row.pincode,
				state: row['State'] || row.state,
				country: row['Country'] || row.country,
				citizenship: row['Citizenship'] || row.citizenship,
				nriCountry: row['NRI Country'] || row.nri_country,
				nriAddress: row['NRI Address'] || row.nri_address,
				nbHasSerial: row['Have Connect Serial'] || row.nbtds || row['Has Connect Nana Bhadia Telephone Directory Serial No.?'],
				nbSerialNumber: row['Connect Serial Number'] || row.nbtds_in || row['Nana Bhadia Connect Serial Number'],
				motherName: row['Mother Name'] || row.mname,
				fatherHusbandName: row['Father/Husband Name'] || row.fhname,
				grandfatherName: row['Grandfather Name'] || row.gfname,
				fario: row['Fario'] || row.fario,
				rationCardColor: row['Ration Card Color'] || row.rc_color,
				personalMediclaim: row['Personal Mediclaim'] || row.pmediclaim,
				personalMediclaimType: row['Personal Mediclaim Type'] || row.pmediclaim_type,
				communityMediclaim: row['Community Mediclaim'] || row.cmediclaim,
				profileCreatedBy: row['Profile Created By'] || row.pcby,
				profileCreatorName: row['Profile Creator Name'] || row.profile_creator_name,
				familyHeadId: row['Head ID'] || row.head_id || row['Family Head'],
				wifeMotherVillage: row['Wife/Mother Village'] || row.wf_village,
				wifeMotherMaidenName: row['Wife/Mother Maiden Name'] || row.wf_fmname,
				marriedDaughterVillage: row['Married Daughter Village'] || row.dmd_village,
			};
		})
		.filter(p => p && (p.firstName || p.lastName || p.location));
}
