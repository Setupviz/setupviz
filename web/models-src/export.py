import bpy, sys
src, dst = sys.argv[-2:]
bpy.ops.wm.open_mainfile(filepath=src)
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT') or o.name.startswith('Plane'): bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True, export_yup=True, export_image_format='AUTO')
