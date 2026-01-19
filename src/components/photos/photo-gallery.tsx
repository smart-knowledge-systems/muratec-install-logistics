"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PhotoGalleryProps {
  storageIds: string[];
  thumbnailSize?: "sm" | "md" | "lg";
}

export function PhotoGallery({
  storageIds,
  thumbnailSize = "md",
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  if (storageIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {storageIds.map((storageId, index) => (
          <PhotoThumbnail
            key={storageId}
            storageId={storageId}
            size={thumbnailSize}
            onClick={() => setSelectedIndex(index)}
            className={sizeClasses[thumbnailSize]}
          />
        ))}
      </div>

      {selectedIndex !== null && (
        <PhotoViewer
          storageIds={storageIds}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNavigate={(newIndex) => setSelectedIndex(newIndex)}
        />
      )}
    </>
  );
}

interface PhotoThumbnailProps {
  storageId: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

function PhotoThumbnail({
  storageId,
  onClick,
  className,
}: PhotoThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const getPhotoUrl = useMutation(api.photos.getPhotoUrl);

  useEffect(() => {
    getPhotoUrl({ storageId }).then((url) => {
      if (url) setImageUrl(url);
    });
  }, [storageId, getPhotoUrl]);

  return (
    <div
      className={`relative rounded-md overflow-hidden border bg-muted cursor-pointer hover:opacity-80 transition-opacity ${className || "w-24 h-24"}`}
      onClick={onClick}
    >
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt="Thumbnail"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      )}
    </div>
  );
}

interface PhotoViewerProps {
  storageIds: string[];
  initialIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function PhotoViewer({
  storageIds,
  initialIndex,
  onClose,
  onNavigate,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Track which storageId the current imageUrl corresponds to
  const [loadedStorageId, setLoadedStorageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const getPhotoUrl = useMutation(api.photos.getPhotoUrl);

  const currentStorageId = storageIds[currentIndex];
  const isLoading = loadedStorageId !== currentStorageId;

  useEffect(() => {
    let cancelled = false;

    getPhotoUrl({ storageId: currentStorageId }).then((url) => {
      if (!cancelled) {
        setImageUrl(url);
        setLoadedStorageId(currentStorageId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentStorageId, getPhotoUrl]);

  const handlePrevious = () => {
    const newIndex =
      currentIndex > 0 ? currentIndex - 1 : storageIds.length - 1;
    setCurrentIndex(newIndex);
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex =
      currentIndex < storageIds.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onNavigate(newIndex);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          {isLoading ? (
            <div className="text-white">Loading...</div>
          ) : imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-white">Failed to load image</div>
          )}

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Navigation */}
          {storageIds.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {storageIds.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
