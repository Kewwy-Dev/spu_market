import React, { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  triggerLabel?: string;
}

export default function ImagePreview({
  src,
  alt = "ภาพที่ส่งในแชท",
  width = 480,
  height = 360,
  className = "",
  triggerLabel,
}: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={`spectrum-image-preview-trigger ${className}`}
          aria-label="เปิดดูภาพขนาดเต็ม"
        >
          {triggerLabel ? <span>{triggerLabel}</span> : <img src={src} alt={alt} width={width} height={height} loading="lazy" />}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="spectrum-image-preview-overlay" />
        <DialogPrimitive.Content
          className="spectrum-image-preview-dialog"
          aria-label="ดูภาพในแชทขนาดเต็ม"
        >
          <DialogPrimitive.Title className="spectrum-image-preview-sr-only">
            ดูภาพในแชทขนาดเต็ม
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="spectrum-image-preview-close" aria-label="ปิดภาพ">
            <X size={22} />
          </DialogPrimitive.Close>
          <img src={src} alt={alt} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
