# «دربك خضر» — render queue for Blender 5.2 on the Mac (Cycles on Metal).
# Run once from Blender's Python console:
#   exec(open("/Users/m7_almattar/adeeb/Claude outputs/darb-cinematic/darb_render.py").read())
# Each shot renders straight to clips/Sx.mov (ProRes 422 HQ, bloom from the compositor) — no frame files,
# so the disk only ever holds the finished clips. A shot is written as Sx.partial.mov and renamed when complete;
# finished clips are skipped on a re-run. Progress goes to render_log.txt.
import bpy, os, glob, time, zipfile
from bpy.app.handlers import persistent

DARB = {
    'root': globals().get('DARB_ROOT') or '/Users/m7_almattar/adeeb/Claude outputs/darb-cinematic',
    'shots': globals().get('DARB_SHOTS') or ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    'current': None, 't0': None, 'running': True, 'written': 0, 'n': 0,
    'spp': globals().get('DARB_SPP'), 'pct': globals().get('DARB_PCT'),
}

def dlog(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print('[darb]', line)
    with open(os.path.join(DARB['root'], 'render_log.txt'), 'a') as f: f.write(line + '\n')

def unzip_textures():
    tex = os.path.join(DARB['root'], 'textures'); os.makedirs(tex, exist_ok=True)
    for z in sorted(glob.glob(os.path.join(DARB['root'], 'textures_*.zip'))):
        with zipfile.ZipFile(z) as zf:
            for n in zf.namelist():
                if not os.path.exists(os.path.join(tex, n)): zf.extract(n, tex)

def use_metal():
    prefs = bpy.context.preferences.addons['cycles'].preferences
    if prefs.compute_device_type != 'METAL': prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    names = []
    for d in prefs.devices:
        d.use = (d.type == 'METAL')
        if d.use: names.append(d.name)
    return names

def clip_path(shot, partial=False):
    return os.path.join(DARB['root'], 'clips', shot + ('.partial.mov' if partial else '.mov'))

def next_shot():
    if not DARB['running']: return None
    for shot in DARB['shots']:
        if os.path.exists(clip_path(shot)): continue
        DARB['current'] = shot
        dlog(f'{shot} open')
        bpy.ops.wm.open_mainfile(filepath=os.path.join(DARB['root'], shot + '.blend'), load_ui=False, use_scripts=False)
        return None
    dlog('ALL DONE')
    remove_handlers()
    return None

@persistent
def darb_on_load(dummy):
    shot = DARB['current']
    if not DARB['running'] or not shot or not bpy.data.filepath.endswith(shot + '.blend'): return
    sc = bpy.context.scene
    # the night textures are the same files as the day ones: point them there instead of storing a second copy
    for img in bpy.data.images:
        if img.source == 'FILE' and '/night_' in img.filepath:
            img.filepath = img.filepath.replace('/night_', '/day_'); img.reload()
    sc.cycles.device = 'GPU'
    if DARB.get('spp'): sc.cycles.samples = DARB['spp']
    if DARB.get('pct'): sc.render.resolution_percentage = DARB['pct']
    ims = sc.render.image_settings
    ims.media_type = 'VIDEO'; ims.file_format = 'FFMPEG'
    ff = sc.render.ffmpeg; ff.format = 'QUICKTIME'; ff.codec = 'PRORES'; ff.ffmpeg_prores_profile = '422_HQ'; ff.audio_codec = 'NONE'
    sc.render.use_file_extension = False
    os.makedirs(os.path.join(DARB['root'], 'clips'), exist_ok=True)
    part = clip_path(shot, partial=True)
    if os.path.exists(part): os.replace(part, part + '.old')   # an interrupted attempt is overwritten, never deleted
    sc.render.filepath = part
    DARB['n'] = sc.frame_end - sc.frame_start + 1; DARB['written'] = 0
    bpy.app.timers.register(start_render, first_interval=1.0)

def start_render():
    shot = DARB['current']; DARB['t0'] = time.time()
    dlog(f'{shot} render start ({DARB["n"]} frames), GPU: {", ".join(use_metal()) or "none"}')
    win = bpy.context.window_manager.windows[0]
    try:
        with bpy.context.temp_override(window=win):
            bpy.ops.render.render('INVOKE_DEFAULT', animation=True)
    except Exception as e:
        dlog(f'invoke failed ({e}), rendering in the foreground')
        bpy.ops.render.render(animation=True)
    return None

@persistent
def darb_on_write(scene, *args):
    if DARB['current'] and DARB['t0']:
        DARB['written'] += 1
        dlog(f'{DARB["current"]} frame {DARB["written"]}/{DARB["n"]} ({time.time() - DARB["t0"]:.0f}s)')

@persistent
def darb_on_complete(scene, *args):
    if DARB['running'] and DARB['current']:
        bpy.app.timers.register(after_render, first_interval=1.0)

@persistent
def darb_on_cancel(scene, *args):
    if DARB['current']:
        dlog(f'{DARB["current"]} cancelled — queue stopped (run the script again to resume)')
        DARB['running'] = False; remove_handlers()

def after_render():
    shot = DARB['current']
    if DARB['written'] < DARB['n']:
        return None          # not the real end of the animation: wait
    os.replace(clip_path(shot, partial=True), clip_path(shot))
    dlog(f'{shot} done in {time.time() - DARB["t0"]:.0f}s -> {clip_path(shot)}')
    bpy.app.timers.register(next_shot, first_interval=1.0)
    return None

HANDLERS = [('load_post', darb_on_load), ('render_write', darb_on_write), ('render_complete', darb_on_complete), ('render_cancel', darb_on_cancel)]

def remove_handlers():
    for hname, fn in HANDLERS:
        lst = getattr(bpy.app.handlers, hname)
        for h in list(lst):
            if getattr(h, '__name__', '') == fn.__name__: lst.remove(h)

remove_handlers()
for hname, fn in HANDLERS: getattr(bpy.app.handlers, hname).append(fn)
unzip_textures()
dlog('queue start')
bpy.app.timers.register(next_shot, first_interval=0.5)
