import bpy
import sys

argv = sys.argv
argv = argv[argv.index("--") + 1:]  # args after --

input_file = argv[0]
output_file = argv[1]

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

ext = input_file.split('.')[-1].lower()
if ext == "fbx":
    bpy.ops.import_scene.fbx(filepath=input_file)
elif ext == "obj":
    bpy.ops.import_scene.obj(filepath=input_file)
elif ext == "stl":
    bpy.ops.import_mesh.stl(filepath=input_file)
else:
    raise Exception(f"Unsupported file type: {ext}")

# Export as GLB
bpy.ops.export_scene.gltf(filepath=output_file, export_format='GLB')
