import type { UploadAsset } from "@/lib/uploadAssets";
import type { InsuranceContract } from "@/types/insurance";

export interface ExtractRequestBody {
  files?: UploadAsset[];
  pdfBase64?: string;
  fileName?: string;
  userContext?: string;
}

export interface ExtractResponseBody {
  contract?: InsuranceContract;
  error?: string;
}
