# Anatomy Atlas: model licenses and credits

Application code and educational summaries are original to this project. Third-party anatomy assets retain their own licenses.

## Z-Anatomy

Z-Anatomy — The libre 3D atlas of anatomy — CC BY-SA 4.0.
Authors: Gauthier Kervyn (design, 3D, anatomy), Marcin Zielinski (Blender add-on), and Z-Anatomy contributors.
Source: https://github.com/Z-Anatomy/Models-of-human-anatomy
License: https://creativecommons.org/licenses/by-sa/4.0/

Derived from BodyParts3D © The Database Center for Life Science (DBCLS), original model by Kousaku Okubo.
The upstream Z-Anatomy attribution cites BodyParts3D under CC BY-SA 2.1 Japan.
The current official BodyParts3D archive separately offers its database under CC BY 4.0, updated February 27, 2025: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

## GLB conversion sources used by this app

- Skeleton, muscles, nervous and visceral systems, and heart components: https://github.com/Liyucheng1997/242_lab-human-anatomy/tree/main/public/models
- Selected ligament meshes: https://github.com/desmond9986/open-anatomy-atlas/blob/main/public/models/z-anatomy/z-anatomy.glb

Changes made here: decoded Draco geometry; baked original world transforms; changed scale and origin consistently; normalized display labels without changing anatomical laterality; extracted system subsets; grouped selected heart wall components; stored indexed binary meshes with optional gzip compression. Per-structure source names and source files remain in manifest.json. These derived Z-Anatomy meshes are distributed under CC BY-SA 4.0, subject to the component-specific terms below.

## Additional upstream attributions and restrictions

The Z-Anatomy source credits the following included or adapted references:
- Brainder and White matter, University of Washington.
- Cranial Nerves and Foramina, University of Dundee, CAHID — CC BY 4.0.
- Anatomy of the Inner Ear, University of Dundee School of Medicine — CC BY-NC-SA 4.0.
- Kidney, Lissie Cowley — CC BY-NC 4.0.

Some upstream components therefore have non-commercial restrictions. Check the upstream license and asset provenance before commercial redistribution; the general Z-Anatomy license does not remove these component restrictions. This local educational app is not a claim of clinical validation.

The full upstream attribution is preserved alongside this file as Z-ANATOMY-LICENSE.txt.

## Learning resources

Introductory anatomy and physiology: NIH / National Cancer Institute, SEER Training Modules: https://training.seer.cancer.gov/anatomy/
Educational summaries in this app are introductory original summaries, not quotations or an exhaustive textbook. Generic system context is explicitly labeled when a structure-specific summary is unavailable.
