import sys; sys.path.insert(0, '/tmp/claude-0/gear')
from common import *
import bpy, math
OUT = '/home/claude/setupviz/web/public/models/'
def box(name, size, loc, m, bev=1.5, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=[v * MM for v in loc], rotation=rot); o = bpy.context.object
    o.name = name; o.scale = [v * MM for v in size]; bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); bevel(o, bev, 3, 40); apply_all(o); smooth(o, 40); return o
def export(name):
    bpy.ops.export_scene.gltf(filepath=OUT + name + '.glb', export_format='GLB', export_apply=True, export_yup=True, export_image_format='AUTO')

# Wallhack SP-004: 490 x 430 x 3.9 mm glass on a full silicone base. Stand-in.
reset()
box('base', (490, 430, 1.4), (0, 0, 0.7), mat('silicone', srgb('#101012'), 0.9), 0.5)
box('glass', (490, 430, 2.5), (0, 0, 2.65), mat('glass', srgb('#E9ECEF'), 0.22, coat=0.4), 0.9)
export('pad')

# ASUS PG27AQDP: 605 x 351 x 50 mm panel, 548 mm tall and 274 mm deep on its stand. Stand-in.
reset()
dark = mat('shell', srgb('#151619'), 0.45); metal = mat('stand', srgb('#2A2C31'), 0.35, metal=1.0); screen = mat('screen', srgb('#050506'), 0.12, coat=0.5)
box('panel', (605, 12, 351), (0, 0, 372), dark, 2.5)
box('screen', (598, 1, 340), (0, -6.3, 374), screen, 0.3)
box('hump', (300, 38, 190), (0, 24, 372), dark, 12)
box('neck', (46, 30, 330), (0, 52, 200), metal, 6, rot=(math.radians(-6), 0, 0))
for sx in (-1, 1):
    box('leg', (30, 250, 12), (sx * 105, -40, 6), metal, 4, rot=(0, 0, math.radians(sx * 28)))
box('heel', (60, 120, 12), (0, 100, 6), metal, 4)
export('monitor')
