#!/bin/bash

# Render a masked, animated Saber overlay from a locked-camera motion source.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
SOURCE=""
MASK=""
OUTPUT=""
FORCE="false"

CROP_X=1830
CROP_Y=480
CROP_WIDTH=570
CROP_HEIGHT=870
FRAME_RATE=12
DURATION_SECONDS=4.5
FRAME_COUNT=54
FRAME_DELAY_MS=83
MAX_BYTES=$((6 * 1024 * 1024))

fail() {
  printf 'Saber motion overlay: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  render-saber-motion-overlay.sh --source <loop.mp4> --mask <mask.png> --output <overlay.webp> [--force]

The source must be a locked-camera 2400x1350 video that already loops cleanly.
The mask must be a 570x870 grayscale image matching the lower-right crop.
The command only writes the requested output; it never enables an overlay in theme.json.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --source) SOURCE="${2:-}"; shift 2 ;;
    --mask) MASK="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --force) FORCE="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

[ -n "$SOURCE" ] && [ -n "$MASK" ] && [ -n "$OUTPUT" ] || { usage >&2; exit 1; }
SOURCE="$(cd "$(dirname "$SOURCE")" && pwd -P)/$(basename "$SOURCE")"
MASK="$(cd "$(dirname "$MASK")" && pwd -P)/$(basename "$MASK")"
OUTPUT="$(cd "$(dirname "$OUTPUT")" && pwd -P)/$(basename "$OUTPUT")"

[ -f "$SOURCE" ] || fail "Motion source does not exist: $SOURCE"
[ -f "$MASK" ] || fail "Mask does not exist: $MASK"
[ "$FORCE" = "true" ] || [ ! -e "$OUTPUT" ] || fail "Refusing to overwrite: $OUTPUT"

for command in ffmpeg ffprobe img2webp webpinfo sips; do
  command -v "$command" >/dev/null 2>&1 || fail "Required command is unavailable: $command"
done

source_size="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$SOURCE")"
[ "$source_size" = "2400x1350" ] || fail "Motion source must be 2400x1350, got $source_size"
mask_width="$(sips -g pixelWidth "$MASK" | /usr/bin/awk '/pixelWidth:/{print $2}')"
mask_height="$(sips -g pixelHeight "$MASK" | /usr/bin/awk '/pixelHeight:/{print $2}')"
[ "$mask_width" = "$CROP_WIDTH" ] && [ "$mask_height" = "$CROP_HEIGHT" ] \
  || fail "Mask must be ${CROP_WIDTH}x${CROP_HEIGHT}, got ${mask_width}x${mask_height}"

# The video is expected to be looped by the generation tool. This pipeline
# deliberately preserves that timing and only extracts the mutable lower-right
# region, leaving the static base image to own the rest of the frame.
FRAME_DIR="$(mktemp -d "${TMPDIR:-/tmp}/saber-motion-overlay.XXXXXX")"
cleanup_frames() {
  /bin/rm -rf "$FRAME_DIR"
}
trap cleanup_frames EXIT

ffmpeg -hide_banner -loglevel error -y \
  -i "$SOURCE" \
  -loop 1 -i "$MASK" \
  -filter_complex "[0:v]fps=${FRAME_RATE},trim=duration=${DURATION_SECONDS},setpts=PTS-STARTPTS,crop=${CROP_WIDTH}:${CROP_HEIGHT}:${CROP_X}:${CROP_Y}[crop];[1:v]format=gray,trim=duration=${DURATION_SECONDS},setpts=PTS-STARTPTS,setsar=1[mask];[crop][mask]alphamerge,format=yuva420p[overlay]" \
  -map "[overlay]" -frames:v "${FRAME_COUNT}" -an \
  "$FRAME_DIR/frame-%03d.png"

frames=("$FRAME_DIR"/frame-*.png)
[ "${#frames[@]}" -eq "$FRAME_COUNT" ] || fail "Expected ${FRAME_COUNT} rendered frames, got ${#frames[@]}"

webp_args=(-loop 0)
for frame in "${frames[@]}"; do
  webp_args+=(-d "$FRAME_DELAY_MS" -lossy -q 82 -m 5 -noexact "$frame")
done
img2webp "${webp_args[@]}" -o "$OUTPUT"

output_size="$(sips -g pixelWidth "$OUTPUT" | /usr/bin/awk '/pixelWidth:/{print $2}')x$(sips -g pixelHeight "$OUTPUT" | /usr/bin/awk '/pixelHeight:/{print $2}')"
[ "$output_size" = "${CROP_WIDTH}x${CROP_HEIGHT}" ] || fail "Unexpected overlay dimensions: $output_size"
output_bytes="$(/usr/bin/stat -f '%z' "$OUTPUT")"
[ "$output_bytes" -le "$MAX_BYTES" ] || fail "Overlay is ${output_bytes} bytes; maximum is ${MAX_BYTES}"
webpinfo "$OUTPUT" >/dev/null || fail "Generated WebP failed validation"

printf 'Created %s (%s bytes, %s, %sfps, %ss).\n' \
  "$OUTPUT" "$output_bytes" "$output_size" "$FRAME_RATE" "$DURATION_SECONDS"
printf 'Review this candidate before adding animatedOverlay to theme.json.\n'
