export type Crop = "circle" | "square";

export type PlatformFormat = {
  id: string;
  platform: string;
  use: string;
  size: number;
  crop: Crop;
  file: string;
  /** Mark size inside the crop. Circle profiles stay inside the platform disc. */
  fit: number;
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
    fit: 0.72,
  },
  {
    id: "google",
    platform: "Google",
    use: "Business Profile logo",
    size: 720,
    crop: "circle",
    file: "google-business-720",
    fit: 0.68,
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    use: "Personal profile",
    size: 400,
    crop: "circle",
    file: "linkedin-profile-400",
    fit: 0.72,
  },
  {
    id: "linkedin-co",
    platform: "LinkedIn",
    use: "Company logo",
    size: 300,
    crop: "square",
    file: "linkedin-company-300",
    fit: 0.82,
  },
  {
    id: "x",
    platform: "X",
    use: "Profile picture",
    size: 400,
    crop: "circle",
    file: "x-profile-400",
    fit: 0.72,
  },
  {
    id: "master",
    platform: "Master",
    use: "Square, 2048",
    size: 2048,
    crop: "square",
    file: "master-2048",
    fit: 0.86,
  },
];
