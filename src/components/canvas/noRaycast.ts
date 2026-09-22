/**
 * Opt a mesh out of picking entirely.
 *
 * Decorative geometry — glow bars, door ribs, the room shell — must never
 * intercept a pointer, both so clicks land on the object the user aimed at and
 * so the raycaster does less work per frame. Assign this to a mesh's `raycast`
 * prop. It has to go on the MESH: `Raycaster` recurses into children whatever
 * the parent group's raycast method does.
 */
export const noRaycast = () => null;
