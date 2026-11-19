import bpy, bmesh, math
from mathutils import Vector
MM = 0.001

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=0.5, metal=0.0, coat=0.0, trans=0.0, ior=1.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat: b.inputs['Coat Weight'].default_value = coat
    if trans:
        b.inputs['Transmission Weight'].default_value = trans; b.inputs['IOR'].default_value = ior
    return m

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def obj_from_bm(name, bm, material=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if material: me.materials.append(material)
    return o

def bevel(o, width_mm, segments=3, angle=40):
    m = o.modifiers.new('bevel', 'BEVEL'); m.width = width_mm * MM; m.segments = segments
    m.limit_method = 'ANGLE'; m.angle_limit = math.radians(angle); m.harden_normals = False
    return m

def apply_all(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)

def smooth(o, angle=35):
    for p in o.data.polygons: p.use_smooth = True
    try:
        o.data.set_sharp_from_angle(angle=math.radians(angle))
    except Exception: pass

def studio(target=(0,0,0), dist=0.55, elev=38, azim=-30, res=(1400, 900), floor='#E6DCCB'):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.78, 0.85, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.35
    bpy.ops.mesh.primitive_plane_add(size=3); fl = bpy.context.object; fl.data.materials.append(mat('floor', srgb(floor), 0.6))
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(40), math.radians(-20), math.radians(-35))); s = bpy.context.object; s.data.energy = 4.0; s.data.angle = math.radians(3)
    bpy.ops.object.light_add(type='AREA', location=(0.3, -0.4, 0.6)); a = bpy.context.object; a.data.energy = 20; a.data.size = 0.8
    a.rotation_euler = (Vector(target) - a.location).to_track_quat('-Z', 'Y').to_euler()
    t = Vector(target); e, z = math.radians(elev), math.radians(azim)
    loc = t + Vector((math.sin(z) * math.cos(e), -math.cos(z) * math.cos(e), math.sin(e))) * dist
    bpy.ops.object.camera_add(location=loc); cam = bpy.context.object; cam.data.lens = 60
    cam.rotation_euler = (t - loc).to_track_quat('-Z', 'Y').to_euler(); sc.camera = cam

def render(path):
    bpy.context.scene.render.filepath = path; bpy.ops.render.render(write_still=True)
