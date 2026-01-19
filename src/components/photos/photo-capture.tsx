"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface PhotoCaptureProps {
  onPhotosChange: (storageIds: string[]) => void;
  existingPhotos?: string[];
  maxPhotos?: number;
}

export function PhotoCapture({
  onPhotosChange,
  existingPhotos = [],
  maxPhotos = 5,
}: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const deletePhoto = useMutation(api.photos.deletePhoto);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);

    try {
      const newStorageIds: string[] = [];

      for (const file of Array.from(files)) {
        // Compress the image
        const compressedFile = await compressImage(file);

        // Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload the file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        const { storageId } = await result.json();
        newStorageIds.push(storageId);
      }

      const updatedPhotos = [...photos, ...newStorageIds];
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);

      toast.success(`${newStorageIds.length} photo(s) uploaded`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async (storageId: string) => {
    try {
      await deletePhoto({ storageId });
      const updatedPhotos = photos.filter((id) => id !== storageId);
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
      toast.success("Photo removed");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove photo");
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas to Blob conversion failed"));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.8, // 80% quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
        >
          <Camera className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Take Photo"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current.click();
              // Re-add capture after click
              setTimeout(() => {
                fileInputRef.current?.setAttribute("capture", "environment");
              }, 100);
            }
          }}
          disabled={uploading || photos.length >= maxPhotos}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Photo
        </Button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((storageId) => (
            <PhotoThumbnail
              key={storageId}
              storageId={storageId}
              onRemove={() => handleRemovePhoto(storageId)}
            />
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {photos.length} / {maxPhotos} photos
        </p>
      )}
    </div>
  );
}

interface PhotoThumbnailProps {
  storageId: string;
  onRemove: () => void;
}

function PhotoThumbnail({ storageId, onRemove }: PhotoThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const getPhotoUrl = useMutation(api.photos.getPhotoUrl);

  // Load image URL on mount
  useState(() => {
    getPhotoUrl({ storageId }).then((url) => {
      setImageUrl(url);
    });
  });

  return (
    <div className="relative aspect-square rounded-md overflow-hidden border bg-muted">
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt="Uploaded"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
