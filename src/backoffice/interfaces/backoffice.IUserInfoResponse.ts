export interface UserInfoResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  preferred_language: string;
  retailer: {
    id: string;
    name: string;
    area_code: string;
  } | null;
}
