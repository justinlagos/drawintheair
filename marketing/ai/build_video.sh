#!/usr/bin/env bash
# Draw in the Air — hero ad assembly. ALL-POSITIVE (Visual Triangle throughout,
# no passive screen-staring shot). Child + purposeful gesture + responding screen.
set -e
cd "$(dirname "$0")"
FONT="/sessions/charming-serene-lamport/.fonts/Outfit-X.ttf"
W=1080; H=1920; FPS=30
OFFER="../ads/DITA_06_offer_9x16.png"

printf 'They control the\nlearning by moving.' > c1.txt
printf 'Screen time that\ngets them moving.' > c2.txt
printf 'Screen time you\nfeel good about.' > c3.txt

cap() { # $1 textfile  $2 enable_expr
cat <<EOF
drawbox=x=(iw-900)/2:y=ih-560:w=900:h=212:color=0x1F1B2E@0.74:t=fill:enable='$2',
drawtext=fontfile=$FONT:textfile=$1:reload=0:fontcolor=white:fontsize=62:line_spacing=14:x=(w-text_w)/2:y=h-522:enable='$2'
EOF
}

# Seg 1 (5s) — canonical hero clip (child L, gesture C, screen R)
ffmpeg -y -i clip_hero.mp4 -filter_complex \
"[0:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,$(cap c1.txt 'gte(t,1.6)')[v]" \
-map "[v]" -an -c:v libx264 -pix_fmt yuv420p -r $FPS -t 5 seg1.mp4 -loglevel error

# Seg 2 (4.5s) — close joyful demo, A responding
ffmpeg -y -i clip_demo.mp4 -filter_complex \
"[0:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,$(cap c2.txt 'gte(t,1.4)')[v]" \
-map "[v]" -an -c:v libx264 -pix_fmt yuv420p -r $FPS -t 4.5 seg2.mp4 -loglevel error

# Seg 3 (3.5s) — parent reassured, movement visible
ffmpeg -y -i clip_parent.mp4 -filter_complex \
"[0:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,$(cap c3.txt 'gte(t,0.6)')[v]" \
-map "[v]" -an -c:v libx264 -pix_fmt yuv420p -r $FPS -t 3.5 seg3.mp4 -loglevel error

# Seg 4 (3.5s) — offer end card
ffmpeg -y -loop 1 -t 3.5 -i "$OFFER" -r $FPS -filter_complex \
"[0:v]scale=$W:$H,zoompan=z='min(zoom+0.0006,1.06)':d=105:s=${W}x${H}:fps=$FPS[v]" \
-map "[v]" -an -c:v libx264 -pix_fmt yuv420p -r $FPS seg4.mp4 -loglevel error

printf "file 'seg1.mp4'\nfile 'seg2.mp4'\nfile 'seg3.mp4'\nfile 'seg4.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -c:v libx264 -pix_fmt yuv420p -r $FPS -movflags +faststart \
  DITA_Hero_16s_9x16.mp4 -loglevel error
ffmpeg -y -i DITA_Hero_16s_9x16.mp4 -vf "crop=1080:1080:0:(in_h-1080)/2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart DITA_Hero_16s_1x1.mp4 -loglevel error

echo BUILT; ls -la DITA_Hero_16s_*.mp4
ffprobe -v error -show_entries format=duration -of csv DITA_Hero_16s_9x16.mp4
