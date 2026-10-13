"""Generate simple original PWA icons (green field, gold lamp + path)."""
import struct
import zlib
from pathlib import Path

GREEN = (11, 92, 80, 255)
GOLD = (246, 217, 141, 255)
WHITE = (255, 255, 255, 255)


def png_rgba(path: Path, pixels, w: int, h: int) -> None:
    raw = b"".join(b"\x00" + bytes(row) for row in pixels)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def dist2(x, y, cx, cy):
    return (x - cx) ** 2 + (y - cy) ** 2


def near_arc(x, y, cx, cy, r, thickness):
    d = (dist2(x, y, cx, cy) ** 0.5) - r
    return abs(d) <= thickness and y >= cy - r * 0.15


def make(size: int):
    s = size
    rows = []
    rad = int(s * 0.23)
    for y in range(s):
        row = bytearray()
        for x in range(s):
            # rounded square mask
            m = int(s * 0.18)
            inside = True
            if x < m and y < m and dist2(x, y, m, m) > m * m:
                inside = False
            if x > s - 1 - m and y < m and dist2(x, y, s - 1 - m, m) > m * m:
                inside = False
            if x < m and y > s - 1 - m and dist2(x, y, m, s - 1 - m) > m * m:
                inside = False
            if x > s - 1 - m and y > s - 1 - m and dist2(x, y, s - 1 - m, s - 1 - m) > m * m:
                inside = False
            if not inside:
                row.extend((0, 0, 0, 0))
                continue
            color = GREEN
            # lamp circle
            if dist2(x, y, s / 2, s * 0.31) <= (s * 0.08) ** 2:
                color = GOLD
            # stem
            elif abs(x - s / 2) < s * 0.018 and s * 0.38 < y < s * 0.46:
                color = GOLD
            # gold outer path
            elif near_arc(x, y, s / 2, s * 0.52, s * 0.28, s * 0.035) and y > s * 0.5:
                color = GOLD
            # white inner path
            elif near_arc(x, y, s / 2, s * 0.5, s * 0.17, s * 0.022) and y > s * 0.48:
                color = WHITE
            row.extend(color)
        rows.append(row)
    return rows


root = Path(__file__).resolve().parents[1] / "icons"
root.mkdir(exist_ok=True)
for size in (192, 512):
    png_rgba(root / f"icon-{size}.png", make(size), size, size)
    print("wrote", size)
