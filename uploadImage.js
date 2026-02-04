// Cloudinary configuration
const CLOUD_NAME = "drxpclusd";
const UPLOAD_PRESET = "user_docs_unsigned";

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Cloudinary error:", error);
    throw new Error("Upload failed");
  }

  return await response.json();
};
