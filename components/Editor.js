import React, {useEffect, useRef, useState, Suspense} from 'react'
import {extend, Canvas} from '@react-three/fiber'
import {OrbitControls, TransformControls, useTexture, Line, useAspect, Environment} from '@react-three/drei'
import * as THREE from 'three'
import pathStore from "../store/path";
import { Vector3 } from 'three';

// TODO: Get Point of Arc
function makeArc(center, start, end, isCW) {
  let temp = new THREE.Vector3(center.x + 10, center.y, center.z);
  let lineA = new THREE.Vector3();
  lineA.copy( temp ).sub( center );
  let lineB = new THREE.Vector3();
  lineB.copy( start ).sub( center );
  let lineC = new THREE.Vector3();
  lineC.copy( end ).sub( center );

  const abs_center = new THREE.Vector3().lerpVectors(start, end, 0.5);

  let positive = 1, positiveS = 1;
  if( (start.y < abs_center.y && start.x > abs_center.x) || (start.y < abs_center.y && start.x < abs_center.x) ) {
    if( center.y > start.y )
      positive = -1;
    if( center.x > abs_center.x )
      positiveS = -1;
  }

  if( (start.y > abs_center.y && start.x > abs_center.x) || (start.y > abs_center.y && start.x < abs_center.x) ) {
    if( center.y > start.y )
      positive = -1;
    if( center.x < abs_center.x )
      positiveS = -1;
  }

  const curve = new THREE.EllipseCurve(
    center.x, center.y,
    center.distanceTo(start), center.distanceTo(start),
    positive * lineA.angleTo(lineB), positive * lineA.angleTo(lineB) + positiveS * lineB.angleTo(lineC),
    isCW,
    0,
  );

  const points = curve.getPoints(100);
  return points;
}

// TODO: Get Center Point of Arc
function calcCenter(start, end, dis, x_f) {
  const center = new THREE.Vector3().lerpVectors(start, end, 0.5);

  const ang2Rad = (ang) => ang * Math.PI / 180;
  const rad2Ang = (rad) => rad * 180 / Math.PI;
  
  let y_f;
  if( (start.y > center.y && start.x > center.x) || (start.y < center.y && start.x < center.x) )
    y_f = -x_f;
  if( (start.y < center.y && start.x > center.x) || (start.y > center.y && start.x < center.x) )
    y_f = x_f;

  let lineA = new THREE.Vector3();
  lineA.copy(start).sub(center);
  let lineB = new THREE.Vector3();
  lineB.copy(new THREE.Vector3(center.x, center.y + 50, center.z)).sub(center);
  let subAng = 90 - rad2Ang( lineA.angleTo(lineB) );
  let offsetY = dis * Math.cos(ang2Rad(subAng));
  let offsetX = Math.sqrt(dis * dis - offsetY * offsetY);
  return new THREE.Vector3(center.x + x_f * offsetX, center.y + y_f * offsetY, center.z);
}

// TODO: Segment Component
function SegmentMesh ({segment, index, orbitRef}) {
  const mesh = useRef()
  const transform = useRef()
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  
  const getColor = () => {
    if (segment.editing) {
      return 0xfaa61a
    }
    if (hovered) {
      return 0x1e87f0
    }
    return 0x0562be
  }

  const updateSegment = pathStore(state => state.updateSegment)
  const segments = pathStore(state => state.segments)
  const updateImgData = pathStore(state => state.updateImgData)
  const imageData = pathStore(state => state.imageData)

  const canEnableZ = segment.command != 'G01' || ( segments[index + 1] && segments[index + 1].command != 'G01')

  useEffect(() => {
    const dragCallback = (event) => { // TODO: transform drag action
      orbitRef.current.enabled = !event.value

      const current = new Vector3(transform.current.children[1].position.x, transform.current.children[1].position.y, transform.current.children[1].position.z);
      if (!event.value) {
        updateSegment(index, {target: {
          x: current.x,
          y: current.y,
          z: current.z
        }})

        // TODO: maintain Background Image scale
        if( clicked ) {
          updateSegment(index, {editing: !segment.editing})
          setClicked(false);
        }
        else {
          updateImgData({ canScale: !imageData.canScale })
        }

        transform.current.update({offset: {x: 0, y: 0, z: 0}})

        if( segment.command != 'G01' ) {
          let start, end;
          
          start = new Vector3(current.x, current.y, current.z);
          end = new Vector3(segments[index-1].target.x, segments[index-1].target.y, segments[index-1].target.z);

          const dis = 0;
          const dir = 1;

          const center = calcCenter(start, end, dis, dir);
          updateSegment(index, { center: {
            ...segment.center,
            x: center.x,
            y: center.y,
          } })
        }
        if( segments[index + 1] && segments[index + 1].command != 'G01' ) {
          let start, end;

          start = new Vector3(segments[index + 1].target.x, segments[index + 1].target.y, segments[index + 1].target.z);
          end = new Vector3(current.x, current.y, current.z);

          const dis = 0;
          const dir = 1;

          const center = calcCenter(start, end, dis, dir);
          updateSegment(index + 1, { center: {
            ...segments[index + 1].center,
            x: center.x,
            y: center.y,
          } })
        }
      }
    }
    transform.current.addEventListener('dragging-changed', dragCallback)

    return () => {
      if( !transform || !transform.current ) return;
      transform.current.removeEventListener('dragging-changed', dragCallback)
    }
  })

  return (
    <TransformControls ref={transform} size={0.5} showX={segment.editing} showY={segment.editing} showZ={segment.editing && !canEnableZ} space='local' position={[segment.target.x, segment.target.y, segment.target.z]}>
      <mesh
        ref={mesh}
        onClick={(e) => {updateSegment(index, {editing: !segment.editing}); updateImgData({ canScale: !imageData.canScale });}}
        onPointerOver={(e) => setHovered(true)}
        onPointerOut={(e) => setHovered(false)}
        onPointerDown={(e) => setClicked(true)}
        onPointerUp={(e) => setClicked(false)}>
        <sphereGeometry args={[1]} />
        <meshStandardMaterial color={getColor()} />
      </mesh>
    </TransformControls>
  )
}

// TODO: Center Point of Arc Component
function CenterMesh ({point, orbitRef, index}) {
  const mesh = useRef()
  const transform = useRef()
  const [clicked, setClicked] = useState(false)

  const getColor = () => {
    return 0xdd36b9
  }

  const updateSegment = pathStore(state => state.updateSegment)
  const segments = pathStore(state => state.segments);
  const updateImgData = pathStore(state => state.updateImgData)
  const imageData = pathStore(state => state.imageData)

  useEffect(() => {
    const dragCallback = (event) => {
      orbitRef.current.enabled = !event.value

      const seg_index = index;
      const start = new THREE.Vector3(segments[seg_index].target.x, segments[seg_index].target.y, segments[seg_index].target.z);
      const end = new THREE.Vector3(segments[seg_index - 1].target.x, segments[seg_index - 1].target.y, segments[seg_index - 1].target.z);
      const center = new THREE.Vector3().lerpVectors(start, end, 0.5);
      const current = new THREE.Vector3(transform.current.children[1].position.x, transform.current.children[1].position.y, transform.current.children[1].position.z);

      let x_f = current.x > center.x ? 1 : -1;

      const dis = current.distanceTo(center);
      const arc_center = calcCenter(start, end ,dis, x_f);

      transform.current.children[1].position.x = arc_center.x;
      transform.current.children[1].position.y = arc_center.y;
      transform.current.children[1].position.z = arc_center.z;

      if (!event.value) {
        if( !transform || !transform.current || !transform.current.children )
          return;

        updateSegment(index, { center: {
          ...point,
          x: transform.current.children[1].position.x,
          y: transform.current.children[1].position.y,
        } })

        transform.current.update({offset: {x: 0, y: 0, z: 0}})

        // TODO: maintain Background Image scale
        if( !clicked )
          updateImgData({ canScale: !imageData.canScale });
      }
    }
    transform.current.addEventListener('dragging-changed', dragCallback)

    return () => {
      if( !transform || !transform.current ) return;
      transform.current.removeEventListener('dragging-changed', dragCallback)
    }
  })

  let points = [];
  let seg_index = index;
  points.push([ segments[seg_index - 1].target.x, segments[seg_index - 1].target.y, segments[seg_index - 1].target.z ])
  points.push([ point.x, point.y, point.z ])
  points.push([ segments[seg_index].target.x, segments[seg_index].target.y, segments[seg_index].target.z ])

  return (
    <mesh>
      <TransformControls ref={transform} size={0.5} showX={true} showY={true} showZ={false} position={[point.x, point.y, point.z]}>
        <mesh
          ref={mesh}
          onClick={e => {updateImgData({ canScale: !imageData.canScale });}}
          onDoubleClick={e => { updateSegment(index, { command: segments[index].command == 'G02' ? 'G03' : 'G02' }); e.stopPropagation(); }}
          onPointerDown={(e) => setClicked(true)}
          onPointerUp={(e) => setClicked(false)}>
          <sphereGeometry args={[1]} />
          <meshStandardMaterial color={getColor()} />
        </mesh>
      </TransformControls>
      
      <Line points={points} color="red" lineWidth={2} dashed={true} />
    </mesh>
  )
}

// TODO: Background Image Component
function ReferenceImage({ orbitRef }) {
  const [dragging, setDragging] = useState(false);
  const [prevScale, setPrevScale] = useState({x: 1, y: 1, z: 1});

  const updateImgData = pathStore(state => state.updateImgData)
  const imageData = pathStore(state => state.imageData);

  const textureProps = useTexture({map: imageData.picData})

  const transform = useRef()

  useEffect(() => {

    if (transform.current) {
      const { current: controls } = transform

      const objectCallback = (event) => {
        setDragging(true);
        
        if( prevScale.x == transform.current.object.scale.x )
          transform.current.object.scale.x = transform.current.object.scale.y;
        if( prevScale.y == transform.current.object.scale.y )
          transform.current.object.scale.y = transform.current.object.scale.x;

        if( transform.current.object.scale.x > transform.current.object.scale.y)
          transform.current.object.scale.y = transform.current.object.scale.x;
        if( transform.current.object.scale.y > transform.current.object.scale.x)
          transform.current.object.scale.x = transform.current.object.scale.y;
      }

      const dragCallback = (event) => {
        orbitRef.current.enabled = !event.value
        setPrevScale({...transform.current.object.scale})

        setDragging(false);

        if( !event.value )
          updateImgData( { scale: transform.current.object.scale.x, canScale: !imageData.canScale } )
      }

      controls.addEventListener('dragging-changed', dragCallback)
      controls.addEventListener('objectChange', objectCallback)
      return () => {
        controls.removeEventListener('dragging-changed', dragCallback)
        controls.removeEventListener('objectChange', objectCallback)
      }
    }
  })

  return (
    <TransformControls ref={transform} space='local' mode="scale" showX={imageData.canScale} showY={imageData.canScale} showZ={false} position={[0,0,-.05]} scale={[imageData.scale, imageData.scale, 1]} >
      <mesh onClick={ (e) => { if( !dragging ) { updateImgData({ canScale: !imageData.canScale }); } e.stopPropagation(); } } >
        <planeGeometry attach="geometry" color="white" args={[100, 100]}/>
        <meshBasicMaterial {...textureProps} attach="material" transparent={true} side={THREE.DoubleSide} opacity={1} />
      </mesh>
    </TransformControls>
  )
}

// TODO: Shape Component (Line, Arc)
function DrawShape({index, segment, orbitRef}) {
  const transformShape = (index, segment) => {
    let start = segments[index];
    let end = segments[index - 1];
    if( start.editing && start.target.z == end.target.z ) {
      let newSegment = {...segment};
      if(newSegment.command == 'G01' ) {
        start = new THREE.Vector3( segments[index].target.x, segments[index].target.y, segments[index].target.z );
        end = new THREE.Vector3( segments[index-1].target.x, segments[index-1].target.y, segments[index-1].target.z );
  
        const center = calcCenter(start, end, 0, 1, 1);
  
        newSegment.command = 'G02'
        newSegment.center = center;
      } else if( newSegment.command == 'G02' || newSegment.command == 'G03' ) {
        newSegment.command = 'G01';
        newSegment.center = {};
      }
      updateSegment(index, newSegment);
    }
  }

  const segments = pathStore(state => state.segments)
  const updateSegment = pathStore(state => state.updateSegment);
  
  let points = [];
  let showCenter = false;

  points.push([ segments[index].target.x, segments[index].target.y, segments[index].target.z ]);
  points.push([ segments[index-1].target.x, segments[index-1].target.y, segments[index-1].target.z ]);
  if( segment.command == 'G02' || segment.command == 'G03' ) {
    const start = new THREE.Vector3(points[0][0], points[0][1], points[0][2]);
    const end = new THREE.Vector3(points[1][0], points[1][1], points[1][2]);

    const center = new THREE.Vector3(segment.center.x, segment.center.y, segment.center.z);
    const direction = segment.command != 'G02';
    points = makeArc(center, start, end, direction);
    points = points.map((point) => {
      return [point.x, point.y, start.z]
    })

    showCenter = segments[index].editing;
  }

  return (
    <mesh>
      <Line points={points} color="red" lineWidth={3} dashed={false} onClick={(e) => { transformShape(index, segment); e.stopPropagation() }} />
      {showCenter ? <CenterMesh point={segment.center} orbitRef={orbitRef} index={index} /> : null}
    </mesh>
  ) 
}

export default function Editor() {
  const orbit = useRef()
  const segments = pathStore(state => state.segments)

  return (
    <Canvas style={{height: 650}} camera={{ position: [50, 10, 100], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 15]} intensity={1} />
      <gridHelper args={[100, 10]} rotation={[Math.PI / 2, 0, 0]} />

      <Suspense fallback={null}>
        <ReferenceImage orbitRef={orbit} />

        {segments.map((segment, i) =>
          <SegmentMesh key={i} segment={segment} index={i} orbitRef={orbit} />
        )}
        {segments.map((segment, i) =>
          i > 0 ? (<DrawShape key={i} index={i} segment={segment} orbitRef={orbit} />) : null
        )}
      </Suspense>
      <OrbitControls ref={orbit} dampingFactor={0.2} />
    </Canvas>
  )
}
