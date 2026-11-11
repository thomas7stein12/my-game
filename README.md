# First-Person 3D Forest Game

A first-person 3D environment built with Three.js, JavaScript, and Vite. This project started as a way for me to learn more about 3D game development, and has gradually grown into a much more detailed environment with custom models, realistic textures, forest surroundings, physics, and performance optimizations.

## 🚧 Work in Progress

This project is still a work in progress. I'm using it as an opportunity to branch out from my usual web development projects and get more comfortable with 3D graphics, game development, and some of the more technical aspects of building real-time applications.

I've been spending more time understanding not just how to build things, but also how they work behind the scenes and how to make them run efficiently.

## 🎮 About the Project

Most of my development experience so far has been focused on web development, working with technologies like React, Next.js, and JavaScript. I wanted to take things a little further and challenge myself with something different.

This project is my attempt at creating a first-person 3D environment using Three.js. What started as a basic platform with simple movement has developed into a forest environment with surrounding trees, realistic ground textures, boulders, jumping platforms, interactive objects, and ambient audio.

I've also started spending more time learning about performance, memory management, 3D model optimization, and how larger scenes can be organized efficiently.

## ✨ Current Features

- First-person 3D environment built with Three.js
- Mouse look and WASD / arrow key movement
- Mobile touchscreen controls with a virtual joystick
- Touch-based camera controls
- Jumping, gravity, and basic physics
- Multiple elevated jumping platforms
- Boulder models with individual collision detection
- Decorative rocks and surrounding forest barriers
- Realistic forest ground with diffuse, normal, and roughness textures
- Surrounding forest with multiple tree species and detail levels
- Randomized grass distribution throughout the environment
- Interactive floating markers with proximity-based messages
- Custom forest fog that gradually reveals the sky when looking upward
- Looping forest ambience audio
- Responsive desktop and mobile controls

## ⚡ Performance & Optimization

One of the biggest things I've been learning through this project is how important performance becomes when working with larger 3D environments.

As the environment has grown, I've been experimenting with different ways to reduce rendering overhead, manage assets, and make the scene more efficient.

Some of the techniques I've been working with include:

- **Instanced Rendering:** Using Three.js `InstancedMesh` to render large numbers of repeated objects like trees and grass without creating a separate draw call for every individual object.

- **Spatial Chunking:** Dividing grass and tree instances into smaller spatial groups so different sections of the environment can be handled independently.

- **Frustum Culling:** Calculating bounding boxes and bounding spheres so Three.js can skip rendering objects outside the camera's viewing area.

- **Geometry Merging:** Using Three.js `BufferGeometryUtils` and `mergeGeometries` to combine multiple grass models into reusable clusters.

- **Level of Detail (LOD):** Experimenting with different levels of model detail for nearby and distant trees to reduce unnecessary geometry.

- **Mesh Compression:** Learning about Meshopt compression and using `MeshoptDecoder` with `GLTFLoader` to load compressed 3D models.

- **Material & Texture Sharing:** Reusing materials and textures between different versions of models to avoid unnecessary duplicate resources.

- **Asynchronous Asset Loading:** Using `Promise.all` to load multiple textures and 3D models concurrently.

- **Memory Management:** Disposing of unused geometries, materials, and textures when they are no longer needed.

- **Texture Optimization:** Working with different texture resolutions and formats to balance visual quality and performance.

I'm still experimenting with these techniques and learning how they affect rendering performance as the environment becomes more complex.

## 🛠️ Built With

- **Three.js** – 3D rendering, geometry, materials, lighting, and scene management
- **JavaScript** – Game logic, physics, controls, and interactions
- **Vite** – Development server and build tool
- **HTML & CSS** – Page structure and mobile interface styling
- **glTF / GLB** – 3D model formats
- **Meshopt** – 3D model compression and decoding

## 📚 Things I'm Learning

This project has given me an opportunity to explore areas of development that I haven't worked with as much before.

Some of the things I'm currently learning and experimenting with include:

- Three.js and real-time 3D rendering
- 3D geometry, materials, textures, and lighting
- First-person camera controls and movement
- Physics, collision detection, and spatial calculations
- Instanced rendering and draw call optimization
- Frustum culling and spatial partitioning
- Level of Detail techniques
- 3D model compression and asset pipelines
- GPU rendering performance and memory management
- Shader modifications and custom visual effects
- Build systems and native development tools like CMake

I'm particularly interested in understanding what happens behind the scenes when a game renders a complex environment and how developers keep everything running smoothly.

## 🚀 Future Improvements

There are still plenty of things I'd like to experiment with as I continue developing this project.

Some of my future goals include:

- Improving environment performance as more objects are added
- Exploring additional rendering and optimization techniques
- Adding more interactions and gameplay mechanics
- Improving the forest environment and surrounding scenery
- Experimenting with more custom shaders and visual effects
- Learning more about game architecture and development tools

---

This project is primarily a learning experience, and I'm looking forward to continuing to build on it as I become more comfortable with 3D development.

Thanks for checking out my project!
