import sys, json; sys.path.insert(0, '/tmp/claude-0/gear')
from common import *
import bpy, bmesh, math
from mathutils import Vector

# Wooting 60HE v2 in its aluminium case, split-spacebar ANSI. From Wooting's published sizes:
# case 305 x 115 mm, 18.4 mm tall at the front and 29 mm at the back, opening 288 x 97.5 mm,
# cap tops about 10 mm above the case rim. Keys at the standard 19.05 mm pitch. No logos.
HERE = '/tmp/claude-0/gear/'
W, D, HF, HB = 305, 115, 18.4, 29.0
IW, ID, POCKET = 288, 97.5, 6.0
U, N = 19.05, 8
LAYOUT = json.load(open(HERE + 'layout.json'))
PROFILE = [(11.0, -7), (9.6, -3), (9.0, 0), (9.4, 4), (9.6, 7)]  # per row: cap height mm, top tilt degrees
reset()
slope = math.atan((HB - HF) / D)
def top_z(y): return HF + (HB - HF) * (y + D / 2) / D

alu = mat('anodized', srgb('#17181A'), rough=0.38, metal=1.0)
housing = mat('switch', srgb('#0B0B0C'), rough=0.5)

def image(name): return bpy.data.images.load(HERE + name)
def cap_material():
    m = mat('caps', (0.02, 0.02, 0.022), rough=0.55)
    t = m.node_tree; b = t.nodes['Principled BSDF']
    a = t.nodes.new('ShaderNodeTexImage'); a.image = image('legends.png')
    g = t.nodes.new('ShaderNodeTexImage'); g.image = image('glow.png')
    t.links.new(a.outputs['Color'], b.inputs['Base Color']); t.links.new(g.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 2.5
    return m
def plate_material():
    m = mat('plate', (0.01, 0.01, 0.01), rough=0.6)
    t = m.node_tree; b = t.nodes['Principled BSDF']
    g = t.nodes.new('ShaderNodeTexImage'); g.image = image('rgb.png')
    t.links.new(g.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 0.9
    return m
caps_mat, plate_mat = cap_material(), plate_material()

def case():
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        x, y = v.co.x * W, v.co.y * D
        v.co = Vector((x * MM, y * MM, top_z(y) * MM if v.co.z > 0 else 0))
    upright = [e for e in bm.edges if abs(e.verts[0].co.x - e.verts[1].co.x) < 1e-6 and abs(e.verts[0].co.y - e.verts[1].co.y) < 1e-6]
    bmesh.ops.bevel(bm, geom=upright, offset=7 * MM, segments=8, affect='EDGES')  # rounded corners in plan
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm('case', bm, alu)
    def carve(size, loc, rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=[v * MM for v in loc], rotation=rot); c = bpy.context.object
        c.scale = [v * MM for v in size]
        b = o.modifiers.new('carve', 'BOOLEAN'); b.object = c; b.operation = 'DIFFERENCE'; b.solver = 'EXACT'
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=b.name); bpy.data.objects.remove(c)
    carve((IW, ID, 40), (0, 0, (HF + HB) / 2 - POCKET + 20), (slope, 0, 0))  # the opening the keys sit in
    carve((17, 1.2, 7.5), (0, -D / 2, 8.5))                                    # the blank badge recess on the front
    bevel(o, 1.3, 3, 40); apply_all(o); smooth(o, 40)
    # strap mount on the left side, near the back
    for name, size, loc in (('bar', (3.2, 26, 7), (-W / 2 - 6.5, 30, 15)), ('post', (5, 3.2, 7), (-W / 2 - 2.5, 41.4, 15)), ('post', (5, 3.2, 7), (-W / 2 - 2.5, 18.6, 15))):
        bpy.ops.mesh.primitive_cube_add(size=1, location=[v * MM for v in loc]); p = bpy.context.object
        p.scale = [v * MM for v in size]; p.data.materials.append(alu); bevel(p, 1.2, 3, 40); apply_all(p); smooth(p); p.parent = o
    return o

def cap(w, row, cell):
    h, tilt = PROFILE[row]
    bw, bd = (w * U - 1.0) * MM, (U - 1.0) * MM
    tw, td = bw - 5.6 * MM, bd - 4.6 * MM
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        up = v.co.z > 0; sx, sy = (tw, td) if up else (bw, bd)
        y = v.co.y * sy + (0.6 * MM if up else 0)   # the top sits a little toward the back
        v.co = Vector((v.co.x * sx, y, (h * MM + math.tan(math.radians(tilt)) * y) if up else 0))
    top = [f for f in bm.faces if f.normal.z > 0.5]
    bmesh.ops.subdivide_edges(bm, edges=list({e for f in top for e in f.edges}), cuts=6, use_grid_fill=True)
    for v in bm.verts:
        if v.co.z > 0.5 * h * MM:
            v.co.z -= 0.6 * MM * max(0, 1 - (v.co.x / (tw / 2)) ** 2)   # the dish
    # legend: only faces on top read their atlas cell; every other face reads the blank cell
    uv = bm.loops.layers.uv.new('UVMap'); cx, cy = cell % N, cell // N
    bm.normal_update()
    for f in bm.faces:
        for l in f.loops:
            if f.normal.z > 0.5:
                ul = max(-0.48, min(0.48, l.vert.co.x / (13.4 * MM))); vl = max(-0.48, min(0.48, (l.vert.co.y - 0.6 * MM) / (14.4 * MM)))
                l[uv].uv = ((cx + 0.5 + ul) / N, 1 - (cy + 0.5 - vl) / N)
            else:
                l[uv].uv = (0.5 / N, 1 - 0.5 / N)
    o = obj_from_bm('key', bm, caps_mat)
    bevel(o, 1.0, 3, 30); apply_all(o); smooth(o, 45)
    return o

body = case()
deck = bpy.data.objects.new('deck', None); bpy.context.scene.collection.objects.link(deck)   # everything on the tilted plate
deck.rotation_euler = (slope, 0, 0); deck.location = (0, 0, ((HF + HB) / 2 - POCKET) * MM); deck.parent = body
bpy.ops.mesh.primitive_plane_add(size=1); plate = bpy.context.object; plate.name = 'plate'
plate.scale = (IW * MM, ID * MM, 1); plate.location = (0, 0, 0.2 * MM); plate.data.materials.append(plate_mat); plate.parent = deck
stem = None; cell = 1
for r, ws in enumerate(LAYOUT['widths']):
    x = -15 * U / 2
    for w in ws:
        k = cap(w, r, cell); cell += 1
        k.location = ((x + w * U / 2) * MM, (2 - r) * U * MM, (POCKET + 0.8) * MM); k.parent = deck
        if stem is None:
            bpy.ops.mesh.primitive_cube_add(size=1); s = bpy.context.object; s.scale = (14 * MM, 14 * MM, (POCKET + 1.5) * MM)
            bpy.ops.object.transform_apply(scale=True); s.data.materials.append(housing); stem = s.data; bpy.data.objects.remove(s)
        s = bpy.data.objects.new('switch', stem); bpy.context.scene.collection.objects.link(s)
        s.location = ((x + w * U / 2) * MM, (2 - r) * U * MM, (POCKET + 1.5) / 2 * MM); s.parent = deck
        x += w * U

if 'render' in sys.argv:
    studio(target=(0, -0.005, 0.015), dist=0.68, elev=32, azim=-22, floor='#2A2B2F')
    render(HERE + 'keyboard.png')
bpy.ops.wm.save_as_mainfile(filepath=HERE + 'keyboard.blend')
