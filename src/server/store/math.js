/**
 * Math types and operations used by the store.
 *
 * @module server/store/math
 * @flow
 */

/** General transform type. */
export type Transform = ?{
  translation?: ?Vector2 | {x?: number, y?: number},
  rotation?: ?number,
  scale?: ?Vector2 | {x?: number, y?: number},
  matrix?: ?(number[]),
};

/**
 * Inverts a transform.
 *
 * @param transform the transform to invert.
 * @return the inverted transform.
 */
export function invertTransform(transform: Transform): Transform {
  if (!transform) {
    return transform;
  }
  // https://www.wikihow.com/Find-the-Inverse-of-a-3x3-Matrix
  const m = getTransformMatrix(transform);
  const determinant =
    m[0] * (m[4] * m[8] - m[5] * m[7]) +
    m[1] * (m[5] * m[6] - m[3] * m[8]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);
  if (determinant === 0.0) {
    return null;
  }
  const scale = 1.0 / determinant;
  return {
    // prettier-ignore
    matrix: [
      (m[4] * m[8] - m[7] * m[5]) * scale,
      (m[7] * m[2] - m[1] * m[8]) * scale,
      (m[1] * m[5] - m[4] * m[2]) * scale,
      
      (m[6] * m[5] - m[3] * m[8]) * scale,
      (m[0] * m[8] - m[6] * m[2]) * scale,
      (m[3] * m[2] - m[0] * m[5]) * scale,
      
      (m[3] * m[7] - m[6] * m[4]) * scale,
      (m[6] * m[1] - m[0] * m[7]) * scale,
      (m[0] * m[4] - m[3] * m[1]) * scale,
    ]
  };
}

/**
 * Simplifies a transform.
 *
 * @param transform the transform to simplify.
 * @param [deleteRedundant=false] if true, delete the redundant properties
 * instead of setting them to null.  Useful for serializing to JSON.
 * @return the simplified transform.
 */
export function simplifyTransform(
  transform: Transform,
  deleteRedundant: boolean = false,
): Transform {
  if (!transform) {
    return transform;
  }
  const translation = getTransformTranslation(transform);
  const rotation = getTransformRotation(transform);
  const scale = getTransformScale(transform);
  if (deleteRedundant) {
    delete transform.matrix;
  } else {
    transform.matrix = null;
  }
  let redundantCount = 0;
  if (translation.x === 0.0 && translation.y === 0.0) {
    if (deleteRedundant) {
      delete transform.translation;
    } else {
      transform.translation = null;
    }
    redundantCount++;
  }
  if (rotation === 0.0) {
    if (deleteRedundant) {
      delete transform.rotation;
    } else {
      transform.rotation = null;
    }
    redundantCount++;
  }
  if (scale.x === 1.0 && scale.y === 1.0) {
    if (deleteRedundant) {
      delete transform.scale;
    } else {
      transform.scale = null;
    }
    redundantCount++;
  }
  return redundantCount === 3 ? null : transform;
}

/**
 * Composes two transforms into one.
 *
 * @param second the second transform to apply.
 * @param first the first transform to apply.
 * @return the combined transform.
 */
export function composeTransforms(
  second: Transform,
  first: Transform,
): Transform {
  if (!second) {
    return first;
  }
  if (!first) {
    return second;
  }
  const m2 = getTransformMatrix(second);
  const m1 = getTransformMatrix(first);
  return {
    // prettier-ignore
    matrix: [
      m2[0] * m1[0] + m2[3] * m1[1] + m2[6] * m1[2],
      m2[1] * m1[0] + m2[4] * m1[1] + m2[7] * m1[2],
      m2[2] * m1[0] + m2[5] * m1[1] + m2[8] * m1[2],
      
      m2[0] * m1[3] + m2[3] * m1[4] + m2[6] * m1[5],
      m2[1] * m1[3] + m2[4] * m1[4] + m2[7] * m1[5],
      m2[2] * m1[3] + m2[5] * m1[4] + m2[8] * m1[5],
      
      m2[0] * m1[6] + m2[3] * m1[7] + m2[6] * m1[8],
      m2[1] * m1[6] + m2[4] * m1[7] + m2[7] * m1[8],
      m2[2] * m1[6] + m2[5] * m1[7] + m2[8] * m1[8],
    ]
  };
}

// prettier-ignore
const IDENTITY_MATRIX = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,  
];

/**
 * Retrieves the matrix corresponding to the provided transform.
 *
 * @param transform the transform of interest.
 * @return the transformation matrix.
 */
export function getTransformMatrix(transform: Transform): number[] {
  if (!transform) {
    return IDENTITY_MATRIX;
  }
  if (!transform.matrix) {
    let tx: ?number;
    let ty: ?number;
    if (transform.translation) {
      tx = transform.translation.x;
      ty = transform.translation.y;
    }
    let sx: ?number;
    let sy: ?number;
    if (transform.scale) {
      sx = transform.scale.x;
      sy = transform.scale.y;
    }
    sx = sx == null ? 1.0 : sx;
    sy = sy == null ? 1.0 : sy;
    const rotation = transform.rotation || 0;
    const cr = Math.cos(rotation);
    const sr = Math.sin(rotation);

    // prettier-ignore
    transform.matrix = [
      cr * sx, sr * sx, 0,
      -sr * sy, cr * sy, 0,
      tx || 0, ty || 0, 1,
    ];
  }
  return transform.matrix;
}

const ZERO_VECTOR = {x: 0.0, y: 0.0};

/**
 * Retrieves the translation corresponding to the given transform.
 *
 * @param transform the transform of interest.
 * @return the translation vector.
 */
export function getTransformTranslation(transform: Transform): Vector2 {
  if (!transform) {
    return ZERO_VECTOR;
  }
  let translation = transform.translation;
  if (!translation) {
    transform.translation = translation = {};
  }
  if (translation.x == null) {
    translation.x = transform.matrix ? transform.matrix[6] : 0.0;
  }
  if (translation.y == null) {
    translation.y = transform.matrix ? transform.matrix[7] : 0.0;
  }
  return (translation: any);
}

/**
 * Retrieves the rotation corresponding to the given transform.
 *
 * @param transform the transform of interest.
 * @return the rotation angle.
 */
export function getTransformRotation(transform: Transform): number {
  if (!transform) {
    return 0.0;
  }
  let rotation = transform.rotation;
  if (rotation == null) {
    if (transform.matrix) {
      transform.rotation = rotation = Math.atan2(
        -transform.matrix[3],
        transform.matrix[4],
      );
    } else {
      transform.rotation = rotation = 0.0;
    }
  }
  return rotation;
}

const ONE_VECTOR = {x: 1.0, y: 1.0};

/**
 * Retrieves the scale corresponding to a given transform.
 *
 * @param transform the transform of interest.
 * @return the scale vector.
 */
export function getTransformScale(transform: Transform): Vector2 {
  if (!transform) {
    return ONE_VECTOR;
  }
  let scale = transform.scale;
  if (!scale) {
    transform.scale = scale = {};
  }
  if (scale.x == null) {
    if (transform.matrix) {
      const dx = transform.matrix[0];
      const dy = transform.matrix[1];
      scale.x = Math.sqrt(dx * dx + dy * dy);
    } else {
      scale.x = 1.0;
    }
  }
  if (scale.y == null) {
    if (transform.matrix) {
      const dx = transform.matrix[3];
      const dy = transform.matrix[4];
      scale.y = Math.sqrt(dx * dx + dy * dy);
    } else {
      scale.y = 1.0;
    }
  }
  return (scale: any);
}

/** Basic two-element vector type. */
export type Vector2 = {x: number, y: number};

/** Simple line segment type. */
export type LineSegment = {start: Vector2, end: Vector2};

/**
 * Creates a new vector or assigns a new value to an existing one.
 *
 * @param [x=0] the x component.
 * @param [y=0] the y component.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function vec2(x: number = 0, y: number = 0, result?: Vector2): Vector2 {
  if (!result) {
    return {x, y};
  }
  result.x = x;
  result.y = y;
  return result;
}

/**
 * Copies a vector.
 *
 * @param vector the vector to copy.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function equals(vector: Vector2, result?: Vector2): Vector2 {
  if (!result) {
    return {x: vector.x, y: vector.y};
  }
  result.x = vector.x;
  result.y = vector.y;
  return result;
}

/**
 * Adds two vectors.
 *
 * @param first the first vector to add.
 * @param second the second vector to add.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function plus(
  first: Vector2,
  second: Vector2,
  result?: Vector2,
): Vector2 {
  if (!result) {
    return {x: first.x + second.x, y: first.y + second.y};
  }
  result.x = first.x + second.x;
  result.y = first.y + second.y;
  return result;
}

/**
 * Adds the second vector to the first.
 *
 * @param first the vector to add to.
 * @param second the vector to add.
 * @return a reference to the first vector, for chaining.
 */
export function plusEquals(first: Vector2, second: Vector2): Vector2 {
  return plus(first, second, first);
}

/**
 * Subtracts the second vector from the first.
 *
 * @param first the vector to subtract from.
 * @param second the vector to subtract.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function minus(
  first: Vector2,
  second: Vector2,
  result?: Vector2,
): Vector2 {
  if (!result) {
    return {x: first.x - second.x, y: first.y - second.y};
  }
  result.x = first.x - second.x;
  result.y = first.y - second.y;
  return result;
}

/**
 * Subtracts the second vector from the first.
 *
 * @param first the vector to subtract from.
 * @param second the vector to subtract.
 * @return a reference to the first vector, for chaining.
 */
export function minusEquals(first: Vector2, second: Vector2): Vector2 {
  return minus(first, second, first);
}

/**
 * Orthogonalizes and normalizes a vector.
 *
 * @param vector the vector to orthonormalize.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function orthonormalize(vector: Vector2, result?: Vector2): Vector2 {
  return normalizeEquals(orthogonalize(vector, result));
}

/**
 *  Orthogonalizes and normalizes a vector.
 *
 * @param vector the vector to orthonormalize.
 * @return a reference to the vector, for chaining.
 */
export function orthonormalizeEquals(vector: Vector2): Vector2 {
  return orthonormalize(vector, vector);
}

/**
 * Normalizes a vector.
 *
 * @param vector the vector to normalize.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function normalize(vector: Vector2, result?: Vector2): Vector2 {
  const len = length(vector);
  return times(vector, len === 0.0 ? 0.0 : 1.0 / len, result);
}

/**
 * Normalizes a vector.
 *
 * @param vector the vector to normalize.
 * @return a reference to the vector, for chaining.
 */
export function normalizeEquals(vector: Vector2): Vector2 {
  return normalize(vector, vector);
}

/**
 * Orthogonalizes a vector (rotates it ninety degrees CCW).
 *
 * @param vector the vector to orthogonalize.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function orthogonalize(vector: Vector2, result?: Vector2): Vector2 {
  if (!result) {
    return {x: -vector.y, y: vector.x};
  }
  // result might be same as vector
  const tmp = vector.x;
  result.x = -vector.y;
  result.y = tmp;
  return result;
}

/**
 * Orthogonalizes a vector.
 *
 * @param vector the vector to orthogonalize.
 * @return a reference to the vector, for chaining.
 */
export function orthogonalizeEquals(vector: Vector2): Vector2 {
  return orthogonalize(vector, vector);
}

/**
 * Multiplies a vector by a scalar.
 *
 * @param vector the vector to scale.
 * @param scalar the scale factor.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function times(
  vector: Vector2,
  scalar: number,
  result?: Vector2,
): Vector2 {
  if (!result) {
    return {x: vector.x * scalar, y: vector.y * scalar};
  }
  result.x = vector.x * scalar;
  result.y = vector.y * scalar;
  return result;
}

/**
 * Multiplies a vector by a scalar.
 *
 * @param vector the vector to scale.
 * @param scalar the scale factor.
 * @return a reference to the vector, for chaining.
 */
export function timesEquals(vector: Vector2, scalar: number): Vector2 {
  return times(vector, scalar, vector);
}

/**
 * Multiplies the components of two vectors.
 *
 * @param first the first vector to multiply.
 * @param second the second vector to multiply.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function timesComponents(
  first: Vector2,
  second: Vector2,
  result?: Vector2,
): Vector2 {
  if (!result) {
    return {x: first.x * second.x, y: first.y * second.y};
  }
  result.x = first.x * second.x;
  result.y = first.y * second.y;
  return result;
}

/**
 * Multiplies the components of two vectors.
 *
 * @param first the first vector to multiply.
 * @param second the second vector to multiply.
 * @return a reference to the first vector, for chaining.
 */
export function timesComponentsEquals(
  first: Vector2,
  second: Vector2,
): Vector2 {
  return timesComponents(first, second, first);
}

/**
 * Computes the length of a vector.
 *
 * @param vector the vector.
 * @return the vector's length.
 */
export function length(vector: Vector2): number {
  return Math.sqrt(dot(vector, vector));
}

/**
 * Computes the distance between two points.
 *
 * @param from the source point.
 * @param to the destination point.
 * @return the distance between the points.
 */
export function distance(from: Vector2, to: Vector2): number {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  return Math.sqrt(vx * vx + vy * vy);
}

/**
 * Computes and returns the dot product of two vectors.
 *
 * @param first the first vector.
 * @param second the second vector.
 * @return the dot product.
 */
export function dot(first: Vector2, second: Vector2): number {
  return first.x * second.x + first.y * second.y;
}

/**
 * Computes and returns the cross product of two vectors.
 *
 * @param first the first vector.
 * @param second the second vector.
 * @return the cross product.
 */
export function cross(first: Vector2, second: Vector2): number {
  return first.x * second.y - first.y * second.x;
}

/**
 * Negates a vector.
 *
 * @param vector the vector to negate.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function negative(vector: Vector2, result?: Vector2): Vector2 {
  if (!result) {
    return {x: -vector.x, y: -vector.y};
  }
  result.x = -vector.x;
  result.y = -vector.y;
  return result;
}

/**
 * Negates a vector.
 *
 * @param vector the vector to negate.
 * @return a reference to the vector, for chaining.
 */
export function negativeEquals(vector: Vector2): Vector2 {
  return negative(vector, vector);
}

/**
 * Checks whether either of the components of a vector is NaN.
 *
 * @param vector the vector to check.
 * @return the NaN state.
 */
export function isNaNVector(vector: Vector2): boolean {
  return isNaN(vector.x) || isNaN(vector.y);
}

/**
 * Checks whether both of the components of a vector are finite numbers.
 *
 * @param vector the vector to check.
 * @return the finite state.
 */
export function isFiniteVector(vector: Vector2): boolean {
  return isFinite(vector.x) && isFinite(vector.y);
}

/**
 * Rotates a vector by the provided angle.
 *
 * @param vector the vector to rotate.
 * @param angle the angle to rotate by.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function rotate(
  vector: Vector2,
  angle: number,
  result?: Vector2,
): Vector2 {
  const sr = Math.sin(angle);
  const cr = Math.cos(angle);
  const x = vector.x * cr - vector.y * sr;
  const y = vector.x * sr + vector.y * cr;
  if (!result) {
    return {x, y};
  }
  result.x = x;
  result.y = y;
  return result;
}

/**
 * Rotates a vector by the provided angle.
 *
 * @param vector the vector to rotate.
 * @param angle the angle to rotate by.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function rotateEquals(vector: Vector2, angle: number): Vector2 {
  return rotate(vector, angle, vector);
}

/**
 * Rounds a vector to nearest integers.
 *
 * @param vector the vector to round.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function round(vector: Vector2, result?: Vector2): Vector2 {
  if (!result) {
    return {x: Math.round(vector.x), y: Math.round(vector.y)};
  }
  vector.x = Math.round(vector.x);
  vector.y = Math.round(vector.y);
  return vector;
}

/**
 * Rounds a vector to nearest integers.
 *
 * @param vector the vector to round.
 * @return a reference to the vector, for chaining.
 */
export function roundEquals(vector: Vector2): Vector2 {
  return round(vector, vector);
}

/** A plane (or line). */
export type Plane = {normal: Vector2, constant: number};

/**
 * Creates a plane from a pair of points.
 *
 * @param first the first point on the plane.
 * @param second the second point on the plane.
 * @param [result] the plane in which to store the result (otherwise, a new
 * plane will be created).
 * @return a reference to the result plane, for chaining.
 */
export function planeFromPoints(
  first: Vector2,
  second: Vector2,
  result?: Plane,
): Plane {
  if (!result) {
    const normal = orthonormalizeEquals(minus(second, first));
    return {normal, constant: -dot(normal, first)};
  }
  orthonormalizeEquals(minus(second, first, result.normal));
  result.constant = -dot(result.normal, first);
  return result;
}

/**
 * Creates a plane from a point and the plane normal.
 *
 * @param point the point on the plane.
 * @param normal the plane normal.
 * @param [result] the plane in which to store the result (otherwise, a new
 * plane will be created).
 * @return a reference to the result plane, for chaining.
 */
export function planeFromPointNormal(
  point: Vector2,
  normal: Vector2,
  result?: Plane,
): Plane {
  if (!result) {
    return {normal: equals(normal), constant: -dot(normal, point)};
  }
  equals(normal, result.normal);
  result.constant = -dot(normal, point);
  return result;
}

/**
 * Computes the signed distance from a plane to a point.
 *
 * @param plane the plane to check against.
 * @param point the point to check.
 * @return the signed distance to the plane.
 */
export function signedDistance(plane: Plane, point: Vector2): number {
  return dot(plane.normal, point) + plane.constant;
}

/**
 * Inverts a plane (same plane, normal faces other way).
 *
 * @param plane the plane to invert.
 * @param [result] the plane in which to store the result (otherwise, a new
 * plane will be created).
 * @return a reference to the result plane, for chaining.
 */
export function invert(plane: Plane, result?: Plane): Plane {
  if (!result) {
    return {normal: negative(plane.normal), constant: -plane.constant};
  }
  negative(plane.normal, result.normal);
  result.constant = -plane.constant;
  return result;
}

/**
 * Inverts a plane (same plane, normal faces other way).
 *
 * @param plane the plane to invert.
 * @return a reference to the plane, for chaining.
 */
export function invertEquals(plane: Plane): Plane {
  return invert(plane, plane);
}

/**
 * Copies a plane.
 *
 * @param plane the plane to copy.
 * @param [result] the plane in which to store the result (otherwise, a new
 * plane will be created).
 * @return a reference to the result plane, for chaining.
 */
export function equalsPlane(plane: Plane, result?: Plane): Plane {
  if (!result) {
    return {normal: equals(plane.normal), constant: plane.constant};
  }
  equals(plane.normal, result.normal);
  result.constant = plane.constant;
  return result;
}

/**
 * Finds the point at which two planes intersect.  If they don't intersect,
 * the result will be NaN.
 *
 * @param first the first plane to check.
 * @param second the second plane to check.
 * @param [result] the vector in which to store the result (otherwise, a new
 * vector will be created).
 * @return a reference to the result vector, for chaining.
 */
export function planeIntersection(
  first: Plane,
  second: Plane,
  result?: Vector2,
): Vector2 {
  const divisor =
    first.normal.x * second.normal.y - first.normal.y * second.normal.x;
  const x =
    (first.normal.y * second.constant - second.normal.y * first.constant) /
    divisor;
  const y =
    (second.normal.x * first.constant - first.normal.x * second.constant) /
    divisor;
  if (!result) {
    return {x, y};
  }
  result.x = x;
  result.y = y;
  return result;
}

/**
 * Clamps a value between a minimum and a maximum.
 *
 * @param value the value to clamp.
 * @param min the minimum boundary.
 * @param max the maximum boundary.
 * @return the clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Linearly interpolates between a start and an end value.
 *
 * @param start the starting point.
 * @param end the ending point.
 * @param parameter the interpolation parameter.
 * @return the interpolated value.
 */
export function mix(start: number, end: number, parameter: number): number {
  return start + parameter * (end - start);
}

/**
 * Converts a value in degrees to radians.
 *
 * @param value the value in degrees.
 * @return the value in radians.
 */
export function radians(value: number): number {
  return (value * Math.PI) / 180.0;
}

/**
 * Converts a value in radians to degrees.
 *
 * @param value the value in radians.
 * @return the value in degrees.
 */
export function degrees(value: number): number {
  return (value * 180.0) / Math.PI;
}

/**
 * Rounds a value to the specified decimal precision.
 *
 * @param value the value to round.
 * @param precision the precision (number of digits after the decimal point) to
 * round to.
 * @return the rounded value.
 */
export function roundToPrecision(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/** Axis-aligned bounds type. */
export type Bounds = {min: Vector2, max: Vector2};

/**
 * Checks whether a set of bounds are valid (minima <= maxima).
 *
 * @param bounds the bounds to check.
 * @return whether or not the bounds are valid.
 */
export function boundsValid(bounds: Bounds): boolean {
  return bounds.min.x <= bounds.max.x && bounds.min.y <= bounds.max.y;
}

/**
 * Creates an empty bounds object.
 *
 * @param [result] the bounds in which to store the result (otherwise, a new
 * bounds object will be created).
 * @return a reference to the result bounds.
 */
export function emptyBounds(result?: Bounds): Bounds {
  if (!result) {
    return {min: vec2(Infinity, Infinity), max: vec2(-Infinity, -Infinity)};
  }
  vec2(Infinity, Infinity, result.min);
  vec2(-Infinity, -Infinity, result.max);
  return result;
}

/**
 * Checks whether one set of bounds contains another entirely.
 *
 * @param first the first bounds to check.
 * @param second the second bounds to check.
 * @return whether the first bounds contain the second.
 */
export function boundsContain(first: Bounds, second: Bounds): boolean {
  return (
    first.min.x <= second.min.x &&
    first.max.x >= second.max.x &&
    first.min.y <= second.min.y &&
    first.max.y >= second.max.y
  );
}

/**
 * Checks whether two sets of bounds intersect.
 *
 * @param first the first bounds to check.
 * @param second the second bounds to check.
 * @return whether the bounds intersect.
 */
export function boundsIntersect(first: Bounds, second: Bounds): boolean {
  return (
    first.min.x <= second.max.x &&
    first.max.x >= second.min.x &&
    first.min.y <= second.max.y &&
    first.max.y >= second.min.y
  );
}

/**
 * Applies a transform to a bounds object.
 *
 * @param bounds the bounds to transform.
 * @param transform the transform to apply.
 * @param [result] the bounds in which to store the result (otherwise, a new
 * bounds object will be created).
 * @return a reference to the result bounds.
 */
export function transformBounds(
  bounds: Bounds,
  transform: Transform,
  result?: Bounds,
): Bounds {
  const matrix = getTransformMatrix(transform);
  let minX = matrix[6];
  let minY = matrix[7];
  let maxX = matrix[6];
  let maxY = matrix[7];
  if (matrix[0] > 0) {
    minX += matrix[0] * bounds.min.x;
    maxX += matrix[0] * bounds.max.x;
  } else {
    minX += matrix[0] * bounds.max.x;
    maxX += matrix[0] * bounds.min.x;
  }
  if (matrix[3] > 0) {
    minX += matrix[3] * bounds.min.y;
    maxX += matrix[3] * bounds.max.y;
  } else {
    minX += matrix[3] * bounds.max.y;
    maxX += matrix[3] * bounds.min.y;
  }
  if (matrix[1] > 0) {
    minY += matrix[1] * bounds.min.x;
    maxY += matrix[1] * bounds.max.x;
  } else {
    minY += matrix[1] * bounds.max.x;
    maxY += matrix[1] * bounds.min.x;
  }
  if (matrix[4] > 0) {
    minY += matrix[4] * bounds.min.y;
    maxY += matrix[4] * bounds.max.y;
  } else {
    minY += matrix[4] * bounds.max.y;
    maxY += matrix[4] * bounds.min.y;
  }
  if (!result) {
    return {min: vec2(minX, minY), max: vec2(maxX, maxY)};
  }
  vec2(minX, minY, result.min);
  vec2(maxX, maxY, result.max);
  return bounds;
}

/**
 * Applies a transform to a bounds object.
 *
 * @param bounds the bounds to transform.
 * @param transform the transform to apply.
 * @return a reference to the bounds.
 */
export function transformBoundsEquals(
  bounds: Bounds,
  transform: Transform,
): Bounds {
  return transformBounds(bounds, transform, bounds);
}

/**
 * Adds a location to a bounds object.
 *
 * @param bounds the bounds to expand.
 * @param x the x coordinate of the location to add.
 * @param y the y coordinate of the location to add.
 * @param [result] the bounds in which to store the result (otherwise, a new
 * bounds object will be created).
 * @return a reference to the result bounds.
 */
export function addToBounds(
  bounds: Bounds,
  x: number,
  y: number,
  result?: Bounds,
): Bounds {
  if (!result) {
    return {
      min: vec2(Math.min(bounds.min.x, x), Math.min(bounds.min.y, y)),
      max: vec2(Math.max(bounds.max.x, x), Math.max(bounds.max.y, y)),
    };
  }
  result.min.x = Math.min(bounds.min.x, x);
  result.min.y = Math.min(bounds.min.y, y);
  result.max.x = Math.max(bounds.max.x, x);
  result.max.y = Math.max(bounds.max.y, y);
  return result;
}

/**
 * Adds a location to a bounds object.
 *
 * @param bounds the bounds to expand.
 * @param x the x coordinate of the location to add.
 * @param y the y coordinate of the location to add.
 * @param [result] the bounds in which to store the result (otherwise, a new
 * bounds object will be created).
 * @return a reference to the result bounds.
 */
export function addToBoundsEquals(
  bounds: Bounds,
  x: number,
  y: number,
): Bounds {
  return addToBounds(bounds, x, y, bounds);
}
