#!/usr/bin/env python3
"""Encode one sample for public/sounds.

    python3 scripts/encode-sample.py input.wav public/sounds/name.m4a

macOS only. Runs afconvert (AAC-LC, 256 kbps constrained VBR), then writes an
exact edit list (edts/elst) into the file. afconvert records the gapless numbers
only in the iTunSMPB tag, which CoreAudio and Chrome honour but Firefox does
not; the edit list makes Firefox drop the 2112 priming samples as well, so
buffer.duration matches the source everywhere (Firefox still keeps up to about
23 ms of trailing encoder padding, which sits under the pad crossfade).
The edit list replaces 36 bytes of the free atom afconvert leaves between moov
and mdat, so the file size and the mdat offset do not change.
"""
import re
import struct
import subprocess
import sys

EDTS_SIZE = 36  # edts(8) + elst(8) + version/flags(4) + entry_count(4) + one v0 entry(12)


def atoms(buf, start, end):
    out = []
    off = start
    while off + 8 <= end:
        size, kind = struct.unpack(">I4s", buf[off:off + 8])
        header = 8
        if size == 1:
            size = struct.unpack(">Q", buf[off + 8:off + 16])[0]
            header = 16
        if size == 0:
            size = end - off
        out.append((kind.decode("latin1"), off, size, header))
        off += size
    return out


def gapless_frames(path):
    info = subprocess.run(["afinfo", path], capture_output=True, text=True, check=True).stdout
    m = re.search(r"(\d+) valid frames \+ (\d+) priming \+ (\d+) remainder = (\d+)", info)
    if not m:
        sys.exit(f"afinfo did not report gapless frame counts for {path}")
    return tuple(int(x) for x in m.groups())


def source_frames(path):
    """Frames in the source: gapless counts when afinfo has them (mp3, m4a), else duration times rate (wav)."""
    info = subprocess.run(["afinfo", path], capture_output=True, text=True, check=True).stdout
    m = re.search(r"(\d+) valid frames", info)
    if m:
        return int(m.group(1))
    rate = int(re.search(r"(\d+) Hz", info).group(1))
    seconds = float(re.search(r"estimated duration: ([\d.]+) sec", info).group(1))
    return round(seconds * rate)


def add_edit_list(path):
    valid, priming, remainder, total = gapless_frames(path)
    buf = bytearray(open(path, "rb").read())
    top = atoms(buf, 0, len(buf))
    if [a[0] for a in top] != ["ftyp", "moov", "free", "mdat"]:
        sys.exit(f"unexpected atom layout {[a[0] for a in top]} in {path}")
    moov, free = top[1], top[2]
    mvhd, trak = atoms(buf, moov[1] + moov[3], moov[1] + moov[2])[:2]
    tkhd, mdia = atoms(buf, trak[1] + trak[3], trak[1] + trak[2])[:2]
    if (mvhd[0], trak[0], tkhd[0], mdia[0]) != ("mvhd", "trak", "tkhd", "mdia"):
        sys.exit(f"unexpected moov/trak children in {path}")
    if buf[mvhd[1] + 8] != 0 or buf[tkhd[1] + 8] != 0:
        sys.exit("expected version 0 mvhd and tkhd")
    timescale = struct.unpack(">I", buf[mvhd[1] + 20:mvhd[1] + 24])[0]
    if timescale != 44100:
        sys.exit(f"movie timescale is {timescale}, expected 44100")
    if struct.unpack(">I", buf[mvhd[1] + 24:mvhd[1] + 28])[0] != total:
        sys.exit("mvhd duration does not match the total frame count")
    if free[2] - EDTS_SIZE < 8 or b"iTunSMPB" not in buf:
        sys.exit("free atom too small or iTunSMPB missing")

    elst = struct.pack(">I4sII", 28, b"elst", 0, 1) + struct.pack(">IiHH", valid, priming, 1, 0)
    edts = struct.pack(">I4s", EDTS_SIZE, b"edts") + elst
    struct.pack_into(">I", buf, trak[1], trak[2] + EDTS_SIZE)
    struct.pack_into(">I", buf, moov[1], moov[2] + EDTS_SIZE)
    struct.pack_into(">I", buf, free[1], free[2] - EDTS_SIZE)
    struct.pack_into(">I", buf, mvhd[1] + 24, valid)  # presentation duration
    struct.pack_into(">I", buf, tkhd[1] + 28, valid)
    insert_at = tkhd[1] + tkhd[2]
    patched = bytes(buf[:insert_at]) + edts + bytes(buf[insert_at:free[1] + 8]) + bytes(buf[free[1] + 8 + EDTS_SIZE:])
    assert len(patched) == len(buf)
    open(path, "wb").write(patched)
    return valid, priming, remainder


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dst = sys.argv[1:3]
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "256000", "-s", "2", "-q", "127", src, dst], check=True)
    valid, priming, remainder = add_edit_list(dst)
    src_valid = source_frames(src)
    after = gapless_frames(dst)
    print(f"{dst}: {valid} valid frames (+{priming} priming, +{remainder} remainder), source {src_valid} frames, afinfo after patch {after[0]}")
    if valid != src_valid or after[0] != valid:
        sys.exit("frame count mismatch, do not ship this file")


if __name__ == "__main__":
    main()
