# Export one of Freddy's .blend models to .glb: only the product (children of its origin
# empty), no studio floor, lights or cameras. ratio < 1 thins the mesh to keep the file small.
# Usage: python export-blend.py model.blend out.glb 1
# Then shrink it: npx @gltf-transform/cli quantize out.glb out.glb
import bpy, sys, mathutils
src, out, ratio = sys.argv[-3], sys.argv[-2], float(sys.argv[-1])
bpy.ops.wm.open_mainfile(filepath=src, load_ui=False, use_scripts=False)
root = next(o for o in bpy.context.scene.objects if o.type == 'EMPTY' and 'origin' in o.name)
keep = [o for o in root.children_recursive if o.type in {'MESH', 'CURVE'} and not o.hide_render]
print('KEEP', len(keep), 'of', len(bpy.context.scene.objects), 'others:', [o.name for o in bpy.context.scene.objects if o not in keep and o.type in {'MESH','CURVE'}][:12])
# Big images cost more download than they show at this size on a web page.
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, round(img.size[1] * 1024 / img.size[0]))
# glTF only understands a plain Principled shader. Glass built from mixed or see-through
# nodes exports as flat white, so each glass material becomes simple dark gloss instead.
for m in {slot.material for o in keep for slot in o.material_slots if slot.material}:
    if m.use_nodes and ('glass' in m.name.lower() or not any(n.type == 'BSDF_PRINCIPLED' for n in m.node_tree.nodes)):
        m.node_tree.nodes.clear()
        shader = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled'); outn = m.node_tree.nodes.new('ShaderNodeOutputMaterial')
        shader.inputs['Base Color'].default_value = (0.012, 0.012, 0.014, 1); shader.inputs['Roughness'].default_value = 0.2
        m.node_tree.links.new(shader.outputs['BSDF'], outn.inputs['Surface']); print('REPLACED', m.name)
bpy.ops.object.select_all(action='DESELECT')
for o in keep:
    o.hide_set(False); o.hide_viewport = False; o.select_set(True)
    if ratio < 1 and o.type == 'MESH' and len(o.data.polygons) > 200:
        m = o.modifiers.new('thin', 'DECIMATE'); m.ratio = ratio
bpy.context.view_layer.objects.active = keep[0]
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
    export_cameras=False, export_lights=False, export_animations=False, export_image_format='WEBP', export_image_quality=80,
    export_texcoords=True, export_normals=True, export_tangents=False)
