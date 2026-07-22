export type Role = 'ADMIN' | 'USER';

export interface User {
  id: number;
  username: string;
  role: Role;
  createdAt: string;
}

export interface Person {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  location: string;
  qualification: string;
  bloodGroup: string;
  dateOfBirth: string;
  gender?: string;
  maritalStatus?: string;
  profession?: string;
  sampraday?: string;
  nbSerialNumber?: string;
  familyHeadId?: string;
  relation?: string;
  mobile?: string;
  altMobile?: string;
  nbHasSerial?: string;
  createdAt: string;
  updatedAt: string;
}
