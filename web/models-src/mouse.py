import sys; sys.path.insert(0, '/tmp/claude-0/gear')
from common import *
import bpy, bmesh, math
from mathutils import Vector

# UNIUS Black Lotus: 119.5 x 64 x 38.5 mm, symmetrical, moderate rear hump, flat front flare,
# carbon fibre shell. x runs front (-) to back (+), y across, z up.
L, WMAX, HMAX = 119.5, 64.0, 38.5
reset()

def carbon_image(n=256):
    img = bpy.data.images.new('carbon', n, n)
    px = []
    for j in range(n):
        for i in range(n):
            # 2x2 twill: tows run diagonally, alternate direction every 16 px cell
            c = ((i // 16) + (j // 16)) % 2
            s = (i + j) if c else (i - j)
            stripe = 0.5 + 0.5 * math.cos(s * math.pi / 8)
            v = 0.018 + 0.03 * stripe
            px += [v, v, v * 1.05, 1]
    img.pixels = px
    img.file_format = 'PNG'; img.filepath_raw = '/tmp/claude-0/gear/carbon.png'; img.save()
    return img

def shell_mat():
    m = mat('carbon', (0.02, 0.02, 0.022), rough=0.32, coat=0.6)
    t = m.node_tree; tex = t.nodes.new('ShaderNodeTexImage'); tex.image = carbon_image()
    uv = t.nodes.new('ShaderNodeTexCoord'); mp = t.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (6, 6, 6)
    t.links.new(uv.outputs['UV'], mp.inputs['Vector']); t.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
    t.links.new(tex.outputs['Color'], t.nodes['Principled BSDF'].inputs['Base Color'])
    return m

def half_width(t):
    # plan view: front flare, slight waist, wider rear, rounded ends
    w = 29.5 - 2.6 * math.sin(math.pi * min(1, t / 0.7)) ** 2 + 2.5 * math.exp(-((t - 0.74) / 0.16) ** 2)
    if t < 0.1: w *= math.sqrt(max(0, 1 - ((0.1 - t) / 0.1) ** 2))
    if t > 0.86: w *= math.sqrt(max(0, 1 - ((t - 0.86) / 0.14) ** 2))
    return w

def height(t):
    # side view: low front, hump about 60% back, falling to the rear
    return 19 + (HMAX - 19) * math.exp(-((t - 0.6) / 0.33) ** 2) - (8 * max(0, t - 0.82) / 0.18)

def shell():
    bm = bmesh.new(); rings = []; N, A = 72, 28
    for k in range(N + 1):
        t = 0.5 - 0.5 * math.cos(math.pi * k / N)
        x = (t - 0.5) * L; w = max(half_width(t), 0.01); h = max(height(t), 3)
        ring = []
        for a in range(A + 1):
            ang = math.pi * a / A  # 0 = right side, pi = left side, over the top
            c, s = math.cos(ang), math.sin(ang)
            y = w * math.copysign(abs(c) ** (2 / 2.6), c)
            z = 3 + (h - 3) * abs(s) ** (2 / 2.2)
            ring.append(bm.verts.new((x * MM, y * MM, z * MM)))
        ring.append(bm.verts.new((x * MM, -w * MM, 0)))
        ring.insert(0, bm.verts.new((x * MM, w * MM, 0)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(len(r0) - 1):
            bm.faces.new((r0[i], r0[i + 1], r1[i + 1], r1[i]))
        bm.faces.new((r0[-1], r0[0], r1[0], r1[-1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.05 * MM)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm('mouse', bm, shell_mat())
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=1.2); bpy.ops.object.mode_set(mode='OBJECT')
    return o

def cut(o, size, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=[v * MM for v in loc], rotation=rot); c = bpy.context.object
    c.scale = [v * MM for v in size]
    b = o.modifiers.new('cut', 'BOOLEAN'); b.object = c; b.operation = 'DIFFERENCE'; b.solver = 'EXACT'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=b.name); bpy.data.objects.remove(c)

o = shell()
x_split = (0.44 - 0.5) * L
cut(o, (L * 0.44, 0.7, 30), (-L / 2 + L * 0.22, 0, 30))         # seam between the two main buttons
cut(o, (0.7, 70, 30), (x_split, 0, 34))                          # seam behind the buttons
cut(o, (25, 9, 30), (-L / 2 + L * 0.27, 0, 33))                  # wheel well
smooth(o, 30)

rub = mat('rubber', srgb('#151618'), rough=0.85)
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=10.5 * MM, depth=6.5 * MM, rotation=(math.pi / 2, 0, 0), location=(( -L / 2 + L * 0.27) * MM, 0, 21.5 * MM))
wheel = bpy.context.object; wheel.name = 'wheel'; wheel.data.materials.append(rub); bevel(wheel, 1.2, 3, 30); apply_all(wheel); smooth(wheel)
# two side buttons on the left
for dx in (-4, 15):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(dx * MM, -(half_width(0.5 + dx / L) + 0.4) * MM, 21 * MM)); sb = bpy.context.object
    sb.scale = (16 * MM, 2.4 * MM, 5 * MM); sb.data.materials.append(o.data.materials[0]); bevel(sb, 1.1, 3, 30); apply_all(sb); smooth(sb)
o.rotation_euler = (0, 0, 0)
if 'render' in sys.argv:
    studio(target=(0, 0, 0.018), dist=0.33, elev=30, azim=-35)
    render('/tmp/claude-0/gear/mouse.png')
bpy.ops.wm.save_as_mainfile(filepath='/tmp/claude-0/gear/mouse.blend')
