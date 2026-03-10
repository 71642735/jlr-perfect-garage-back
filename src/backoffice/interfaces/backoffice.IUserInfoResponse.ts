export interface UserInfoResponse {
  id: string;
  name: string;
  last_name: string;
  email: string;
  preferred_language: string;
  retailer?: {
    id: number;
    name: string;
    area_code: string;
  };
  clients?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
    phone: string;
    created: Date;
    referees: {
      id: number;
      name: string;
      last_name: string;
      email: string;
      phone: string;
      created: Date;
      voucher_number: string;
    }[];
  }[];
}
