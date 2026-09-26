export type Crop = "circle" | "square";

export type PlatformFormat = {
  id: string;
  platform: string;
  use: string;
  size: number;
  crop: Crop;
  file: string;
};

/**
 * Profile and logo sizes the platforms still publish.
 * Circle crops are applied by the platform — we export a square file,
 * with the mark fitted inside the circle so the crop does not shave it.
 */
export const FORMATS: PlatformFormat[] = [
  {
    id: "instagram",
    platform: "Instagram",
    use: "Profile picture",
    size: 320,
    crop: "circle",
    file: "instagram-profile-320",
  },
  {
    id: "google",
    platform: "Google",
    use: "Business Profile logo",
    size: 720,
    crop: "circle",
    file: "google-business-720",
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    use: "Personal profile",
    size: 400,
    crop: "circle",
    file: "linkedin-profile-400",
  },
  {
    id: "linkedin-co",
    platform: "LinkedIn",
    use: "Company logo",
    size: 300,
    crop: "square",
    file: "linkedin-company-300",
  },
  {
    id: "x",
    platform: "X",
    use: "Profile picture",
    size: 400,
    crop: "circle",
    file: "x-profile-400",
  },
];
