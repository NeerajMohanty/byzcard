import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_PHOTO_CROP, type PhotoCrop } from "@/core/card/types";
import { PhotoField } from "@/features/editor/PhotoField";

beforeAll(() => {
  // jsdom has no object URLs; the preview just needs a stable string.
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: () => "blob:test", revokeObjectURL: () => undefined }),
  );
  // jsdom has no PointerEvent: extend MouseEvent so pointerId and the
  // client coordinates survive fireEvent.pointer* dispatches.
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  vi.stubGlobal("PointerEvent", TestPointerEvent);
});

const PHOTO = {
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
  meta: { mimeType: "image/jpeg", width: 512, height: 512, byteSize: 3 },
};

function renderField(crop: PhotoCrop = DEFAULT_PHOTO_CROP) {
  const onCropChange = vi.fn();
  const utils = render(
    <PhotoField
      fullName="Ada Lovelace"
      photo={PHOTO}
      crop={crop}
      onPhotoChange={vi.fn()}
      onCropChange={onCropChange}
    />,
  );
  return { onCropChange, ...utils };
}

describe("photo adjustment", () => {
  it("shows a compact form: Adjust photo button, no coordinate sliders", () => {
    const { container } = renderField();
    expect(screen.getByRole("button", { name: "Adjust photo" })).toBeDefined();
    expect(container.querySelectorAll("input[type='range']")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/horizontal|vertical/iu);
  });

  it("opens the focused editor with a title, gesture stage, and Done closing it", () => {
    renderField();
    fireEvent.click(screen.getByRole("button", { name: "Adjust photo" }));
    const dialog = screen.getByRole("dialog", { name: "Adjust photo" });
    expect(dialog).toBeDefined();
    // The gesture surface must not let the page scroll during drags.
    expect(screen.getByTestId("photo-adjust-stage").style.touchAction).toBe("none");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dragging on the stage pans the crop directly", () => {
    const { onCropChange } = renderField();
    fireEvent.click(screen.getByRole("button", { name: "Adjust photo" }));
    const stage = screen.getByTestId("photo-adjust-stage");
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 120, clientY: 100 });
    expect(onCropChange).toHaveBeenCalled();
    const next = onCropChange.mock.calls.at(-1)?.[0] as PhotoCrop;
    // Square image in the 4:5 frame overflows horizontally only: x moves,
    // y has no overflow at zoom 1, zoom unchanged.
    expect(next.x).toBeGreaterThan(0);
    expect(next.y).toBe(0);
    expect(next.zoom).toBe(1);
  });

  it("pinching with two pointers zooms", () => {
    const { onCropChange } = renderField();
    fireEvent.click(screen.getByRole("button", { name: "Adjust photo" }));
    const stage = screen.getByTestId("photo-adjust-stage");
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 150 });
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 160, clientY: 150 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 160, clientY: 150 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 200, clientY: 150 });
    const next = onCropChange.mock.calls.at(-1)?.[0] as PhotoCrop;
    expect(next.zoom).toBeGreaterThan(1);
  });

  it("zoom buttons and Reset work and stay within bounds", () => {
    const { onCropChange } = renderField({ x: 0.5, y: 0, zoom: 2.4 });
    fireEvent.click(screen.getByRole("button", { name: "Adjust photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect((onCropChange.mock.calls.at(-1)?.[0] as PhotoCrop).zoom).toBe(2.5); // clamped
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onCropChange.mock.calls.at(-1)?.[0]).toEqual(DEFAULT_PHOTO_CROP);
  });
});
