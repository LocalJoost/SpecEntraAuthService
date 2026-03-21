export interface ITokenData {
    oid: string;
    name: string;
    exp: number;
    ctry: string;
}

export interface ITokenError {
  error: string
  error_description: string
  error_codes?: number[]
}

export interface ITokenResponse {
  token_type: string
  scope: string
  expires_in: number
  access_token: string
  refresh_token?: string
  id_token?: string
}

export interface ITokenError {
  error: string
  error_description: string
  error_codes?: number[]
}