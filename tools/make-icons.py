"""
앱 아이콘 생성 스크립트.
아이콘 디자인을 바꾸고 싶으면 아래 색/모양을 고친 뒤 다시 실행하세요.

    python3 tools/make-icons.py

만들어지는 파일: public/ 아래 아이콘들
"""

from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(OUT, exist_ok=True)

BG = (214, 126, 58)        # 브랜드 주황
LEAF = (255, 255, 255)
LEAF_DIM = (255, 255, 255, 150)

SS = 8  # 슈퍼샘플링 배율 (계단현상 제거용)


def draw_icon(size, padding_ratio=0.0, rounded=True, bg=BG):
    """싹이 트는 모양 + 체크마크. padding_ratio 는 maskable 아이콘용 여백."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 배경
    if rounded:
        r = int(S * 0.225)  # iOS 스타일 둥근 모서리
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=bg)
    else:
        d.rectangle([0, 0, S - 1, S - 1], fill=bg)

    # 내용 영역 (maskable 은 가장자리가 잘릴 수 있어 안쪽으로 더 밀어넣는다)
    pad = S * (0.22 + padding_ratio)
    box = (pad, pad, S - pad, S - pad)
    w = box[2] - box[0]
    h = box[3] - box[1]
    cx = box[0] + w / 2
    cy = box[1] + h / 2

    # 줄기 — 아래에서 위로
    stem_w = max(2, int(w * 0.085))
    stem_top = cy - h * 0.14
    d.line([(cx, cy + h * 0.48), (cx, stem_top)], fill=LEAF, width=stem_w)
    # 줄기 끝을 둥글게
    d.ellipse(
        [cx - stem_w / 2, stem_top - stem_w / 2, cx + stem_w / 2, stem_top + stem_w / 2],
        fill=LEAF,
    )

    def leaf(center, length, thickness, angle):
        """타원을 그린 뒤 회전시켜 잎 하나를 만든다."""
        pad = int(length)
        layer = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.ellipse(
            [pad - length / 2, pad - thickness / 2, pad + length / 2, pad + thickness / 2],
            fill=LEAF,
        )
        layer = layer.rotate(angle, resample=Image.BICUBIC, center=(pad, pad))
        img.alpha_composite(
            layer, dest=(int(center[0] - pad), int(center[1] - pad))
        )

    # 오른쪽 잎 (크게, 위로 뻗음)
    leaf(
        center=(cx + w * 0.19, stem_top - h * 0.13),
        length=w * 0.46,
        thickness=w * 0.24,
        angle=42,
    )
    # 왼쪽 잎 (조금 작게, 낮게)
    leaf(
        center=(cx - w * 0.17, stem_top - h * 0.02),
        length=w * 0.38,
        thickness=w * 0.20,
        angle=-38,
    )

    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path, "PNG", optimize=True)
    print(f"  {name}  ({img.size[0]}x{img.size[1]})")


print("아이콘 생성:")

# Android / PWA
save(draw_icon(192, rounded=True), "icon-192.png")
save(draw_icon(512, rounded=True), "icon-512.png")

# maskable: 어떤 모양으로 잘려도 내용이 안 잘리게 여백을 더 준 꽉 찬 사각형
save(draw_icon(512, padding_ratio=0.06, rounded=False), "icon-maskable-512.png")

# iOS 홈화면 (iOS 가 알아서 둥글게 깎으므로 사각형으로)
save(draw_icon(180, rounded=False), "apple-touch-icon.png")

# 파비콘
save(draw_icon(32, rounded=True), "favicon-32.png")

print("완료 — public/ 폴더를 확인하세요.")
