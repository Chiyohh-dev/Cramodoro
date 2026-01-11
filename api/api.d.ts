export interface AuthLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    bio?: string;
    fontSize?: number;
    profilePicture?: string;
  };
}

export interface AuthSignupResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    bio?: string;
    fontSize?: number;
    profilePicture?: string;
  };
}

export interface UserProfileResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    bio?: string;
    fontSize?: number;
    profilePicture?: string;
  };
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  fontSize?: number;
  profilePicture?: string;
}

export const authAPI: {
  login: (usernameOrEmail: string, password: string) => Promise<AuthLoginResponse>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<AuthSignupResponse>;
};

export const userAPI: {
  getProfile: (token: string) => Promise<UserProfileResponse>;
  updateProfile: (token: string, data: UpdateProfileData) => Promise<{ message: string }>;
  deleteAccount: (token: string) => Promise<{ message: string }>;
};

export const API_URL: string;
export const TOKEN_KEY: string;
