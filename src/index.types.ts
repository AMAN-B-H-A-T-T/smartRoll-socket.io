export interface IEventMessage {
  event?: string;
  client?: "django" | "FE";
  data?: IEventData;
  status_code?: number;
}

type IEventDataTyepe =
  | IAuthentication
  | string
  | ISessionData
  | IOnGoingSessionData
  | IOnGoingSessionResponse;

export interface IEventData {
  session_id: string;
  auth_token?: string | null;
  data?: IEventDataTyepe;
  status: boolean;
  message?: string;
}

export interface IAuthentication {
  session_id: string;
  session_status: string;
  auth_token: string;
}

export interface IOnGoingSessionData {
  session_id: string;
  data: any;
}

export interface ISessionData {
  session_id: string;
  student: IStudents;
}
interface IStudents {
  student_name: string;
  entrollment_number: string;
  batch: string;
  time: string;
  attendance_status: string;
  department: string;
}

export interface IServerSideSessionEndedResponse {
  session_id: string;
}

export interface ISessionEndRequest {
  client: string;
  session_id: string;
  auth_token: string;
}

export interface IOnGoingSessionResponse {
  session_id: string;
  day: string;
  created_at: string;
  active: string;
  lecture: any;
  student_count: number;
  marked_attendances: IMarkedAttendancesResponse[] | [];
}

interface IMarkedAttendancesResponse {
  slug: string;
  studnet: IStudentDetails;
  is_present: boolean;
  marking_time: string | null;
  batch: any;
  manual: boolean;
}

interface IStudentDetails {
  slug: string;
  profile: IProfile;
  sr_no: string;
  enrollment: string;
  branch: IBranch;
}

interface IProfile {
  name: string;
  email: string;
  role: string;
}

interface IBranch {
  branch_name: string;
  slug: string;
}
