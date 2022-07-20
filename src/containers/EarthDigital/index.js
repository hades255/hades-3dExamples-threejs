import './index.styl';
import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import * as dat from 'dat.gui';
import imgData from '@/containers/EarthDigital/images/earth.jpg';
import lineFragmentShader from '@/containers/EarthDigital/shaders/line/fragment.glsl';
import { chart_1_option, chart_2_option, chart_3_option, chart_4_option, chart_5_option } from '@/containers/EarthDigital/scripts/echartConfig';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, DatasetComponent, TransformComponent, PolarComponent, LegendComponent, ToolboxComponent } from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  BarChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  PolarComponent,
  LegendComponent,
  ToolboxComponent,
  LineChart,
  PieChart
]);

const weekMap = {
  '1': '月',
  '2': '火',
  '3': '水',
  '4': '木',
  '5': '金',
  '6': '土',
  '7': '日',
};

const tips = [
  '太空里很暖和，像小主人抱我的温度，37.5℃',
  '不要换台，不要走开，星际直播马上回来',
  '爱，就是组成我的元件',
  '人类对孤独的理解是有限的，对爱的诠释是无限的',
  '我会飞得更高',
  '我的一小步，见证友谊的一大步',
  '释放我热烈的爱',
  '呵，你咋不上天呢',
  '比机器人更爱机器，比宇航员更爱宇航，这是种严肃的自我认知',
  '把你送回太空好吗',
  '用整个灵魂向你比心',
  '再渺小的心愿，银河系都有它的容身之所',
  'Yeah，放飞自我',
  '地球生存，hard模式'
];

export default class Earth extends React.Component {

  constructor () {
    super();
    this.week = weekMap[new Date().getDay()]
    this.time = '00:00:00'
  }

  state = {
    week: weekMap[new Date().getDay()],
    time: '00:00:00',
    showModal: false,
    modelText: tips[0]
  }

  componentDidMount () {
    this.initThree();
    this.initChart();
    this.updateTime();
  }

  componentWillUnmount() {
    this.timeInterval && clearInterval(this.timeInterval);
  }

  initThree = () => {
    let earth;
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, .01, 50);
    camera.position.set(0, 0, 15.5);

    const renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('canvas.webgl'),
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;

    let params = {
      colors: {
        // 点图颜色
        base: "#f9f002",
        gradInner: "#8ae66e",
        gradOuter: "#03c03c"
      },
      reset: () => {controls.reset()}
    }

    let maxImpactAmount = 10;
    let impacts = [];
    let trails = [];
    for (let i = 0; i < maxImpactAmount; i++) {
      impacts.push({
        impactPosition: new THREE.Vector3().random().subScalar(0.5).setLength(5),
        impactMaxRadius: 5 * THREE.Math.randFloat(0.5, 0.75),
        impactRatio: 0,
        prevPosition: new THREE.Vector3().random().subScalar(0.5).setLength(5),
        trailRatio: {value: 0},
        trailLength: {value: 0}
      });
      makeTrail(i);
    }

    let uniforms = {
      impacts: {value: impacts},
      maxSize: {value: 0.04},
      minSize: {value: 0.03},
      waveHeight: {value: 0.1},
      scaling: {value: 2},
      gradInner: {value: new THREE.Color(params.colors.gradInner)},
      gradOuter: {value: new THREE.Color(params.colors.gradOuter)}
    }

    var tweens = [];

    for (let i = 0; i < maxImpactAmount; i++) {
      tweens.push({
        runTween: () => {
          let path = trails[i];
          let speed = 3;
          let len = path.geometry.attributes.lineDistance.array[99];
          let dur = len / speed;
          let tweenTrail = new TWEEN.Tween({value: 0})
            .to({value: 1}, dur * 1000)
            .onUpdate( val => {
              impacts[i].trailRatio.value = val.value;
            });
            var tweenImpact = new TWEEN.Tween({ value: 0 })
            .to({ value: 1 }, THREE.Math.randInt(2500, 5000))
            .onUpdate(val => {
              uniforms.impacts.value[i].impactRatio = val.value;
            })
            .onComplete(val => {
              impacts[i].prevPosition.copy(impacts[i].impactPosition);
              impacts[i].impactPosition.random().subScalar(0.5).setLength(5);
              setPath(path, impacts[i].prevPosition, impacts[i].impactPosition, 1);
              uniforms.impacts.value[i].impactMaxRadius = 5 * THREE.Math.randFloat(0.5, 0.75);
              tweens[i].runTween();
            });
          tweenTrail.chain(tweenImpact);
          tweenTrail.start();
        }
      });
    }

    tweens.forEach(t => {t.runTween();})
    makeGlobeOfPoints();
    window.addEventListener('resize', onWindowResize);

    const gui = new dat.GUI();
    gui.add(uniforms.maxSize, 'value', 0.01, 0.06).step(0.001).name('land');
    gui.add(uniforms.minSize, 'value', 0.01, 0.06).step(0.001).name('ocean');
    gui.add(uniforms.waveHeight, 'value', 0.1, 1).step(0.001).name('waveHeight');
    gui.add(uniforms.scaling, 'value', 1, 5).step(0.01).name('scaling');
    gui.addColor(params.colors, 'base').name('base color').onChange(val => {
      if (earth) earth.material.color.set(val);
    });
    gui.addColor(params.colors, 'gradInner').name('inner').onChange(val => {
      uniforms.gradInner.value.set(val);
    });
    gui.addColor(params.colors, 'gradOuter').name('outer').onChange(val => {
      uniforms.gradOuter.value.set(val);
    });
    gui.add(params, 'reset').name('Reset Controls');
    gui.close();
    gui.hide();

    renderer.setAnimationLoop( _ => {
      TWEEN.update();
      earth.rotation.y += 0.001;
      renderer.render(scene, camera);
    });

    // 增加点击事件，声明raycaster和mouse变量
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    window.addEventListener('click', event => {
      // 通过鼠标点击的位置计算出raycaster所需要的点的位置，以屏幕中心为原点，值的范围为-1到1.
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
      // 通过鼠标点的位置和当前相机的矩阵计算出raycaster
      raycaster.setFromCamera(mouse, camera);
      // 获取raycaster直线和所有模型相交的数组集合
      var intersects = raycaster.intersectObjects(earth.children);
      if (intersects.length > 0) {
        this.setState({
          showModal: true,
          modelText: tips[Math.floor(Math.random() * tips.length)]
        })
      }
    }, false);

    function makeGlobeOfPoints(){
      let dummyObj = new THREE.Object3D();
      let p = new THREE.Vector3();
      let sph = new THREE.Spherical();
      let geoms = [];
      let tex = new THREE.TextureLoader().load(imgData);
      let counter = 75000;
      let rad = 5;
      let r = 0;
      let dlong = Math.PI * (3 - Math.sqrt(5));
      let dz = 2 / counter;
      let long = 0;
      let z = 1 - dz / 2;
      for (let i = 0; i < counter; i++) {
        r = Math.sqrt(1 - z * z);
        p.set( Math.cos(long) * r, z, -Math.sin(long) * r).multiplyScalar(rad);
        z = z - dz;
        long = long + dlong;
        sph.setFromVector3(p);
        dummyObj.lookAt(p);
        dummyObj.updateMatrix();
        let g =  new THREE.PlaneGeometry(1, 1);
        g.applyMatrix4(dummyObj.matrix);
        g.translate(p.x, p.y, p.z);
        let centers = [
          p.x, p.y, p.z,
          p.x, p.y, p.z,
          p.x, p.y, p.z,
          p.x, p.y, p.z
        ];
        let uv = new THREE.Vector2(
          (sph.theta + Math.PI) / (Math.PI * 2),
          1. - sph.phi / Math.PI
        );
        let uvs = [
          uv.x, uv.y,
          uv.x, uv.y,
          uv.x, uv.y,
          uv.x, uv.y
        ];
        g.setAttribute("center", new THREE.Float32BufferAttribute(centers, 3));
        g.setAttribute("baseUv", new THREE.Float32BufferAttribute(uvs, 2));
        geoms.push(g);
      }
      let g = mergeBufferGeometries(geoms);
      let m = new THREE.MeshBasicMaterial({
        color: new THREE.Color(params.colors.base),
        onBeforeCompile: shader => {
          shader.uniforms.impacts = uniforms.impacts;
          shader.uniforms.maxSize = uniforms.maxSize;
          shader.uniforms.minSize = uniforms.minSize;
          shader.uniforms.waveHeight = uniforms.waveHeight;
          shader.uniforms.scaling = uniforms.scaling;
          shader.uniforms.gradInner = uniforms.gradInner;
          shader.uniforms.gradOuter = uniforms.gradOuter;
          shader.uniforms.tex = {value: tex};
          shader.vertexShader = `
            struct impact {
              vec3 impactPosition;
              float impactMaxRadius;
              float impactRatio;
            };
            uniform impact impacts[${maxImpactAmount}];
            uniform sampler2D tex;
            uniform float maxSize;
            uniform float minSize;
            uniform float waveHeight;
            uniform float scaling;

            attribute vec3 center;
            attribute vec2 baseUv;

            varying float vFinalStep;
            varying float vMap;

            ${shader.vertexShader}
          `.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
            float finalStep = 0.0;
            for (int i = 0; i < ${maxImpactAmount};i++){
              float dist = distance(center, impacts[i].impactPosition);
              float curRadius = impacts[i].impactMaxRadius * impacts[i].impactRatio;
              float sstep = smoothstep(0., curRadius, dist) - smoothstep(curRadius - ( 0.25 * impacts[i].impactRatio ), curRadius, dist);
              sstep *= 1. - impacts[i].impactRatio;
              finalStep += sstep;
            }
            finalStep = clamp(finalStep, 0., 1.);
            vFinalStep = finalStep;

            float map = texture(tex, baseUv).g;
            vMap = map;
            float pSize = map < 0.5 ? maxSize : minSize;
            float scale = scaling;

            transformed = (position - center) * pSize * mix(1., scale * 1.25, finalStep) + center; // scale on wave
            transformed += normal * finalStep * waveHeight; // lift on wave
            `
          );
          shader.fragmentShader = `
            uniform vec3 gradInner;
            uniform vec3 gradOuter;
            varying float vFinalStep;
            varying float vMap;
            ${shader.fragmentShader}
            `.replace(
            `vec4 diffuseColor = vec4( diffuse, opacity );`,
            `
            // shaping the point, pretty much from The Book of Shaders
            vec2 hUv = (vUv - 0.5);
            int N = 8;
            float a = atan(hUv.x,hUv.y);
            float r = PI2/float(N);
            float d = cos(floor(.5+a/r)*r-a)*length(hUv);
            float f = cos(PI / float(N)) * 0.5;
            if (d > f) discard;

            vec3 grad = mix(gradInner, gradOuter, clamp( d / f, 0., 1.)); // gradient
            vec3 diffuseMap = diffuse * ((vMap > 0.5) ? 0.5 : 1.);
            vec3 col = mix(diffuseMap, grad, vFinalStep); // color on wave
            //if (!gl_FrontFacing) col *= 0.25; // moderate the color on backside
            vec4 diffuseColor = vec4( col , opacity );
            `
          );
        }
      });
      m.defines = {'USE_UV':''};
      earth = new THREE.Mesh(g, m);
      earth.rotation.y = Math.PI;
      trails.forEach(t => {earth.add(t)});
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(4.9995, 72, 36), new THREE.MeshBasicMaterial({color: new THREE.Color(0x000000)})));
      earth.position.set(0, -.4, 0);
      scene.add(earth);
    }

    function makeTrail(idx){
      let pts = new Array(100 * 3).fill(0);
      let g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      let m = new THREE.LineDashedMaterial({
        color: params.colors.gradOuter,
        transparent: true,
        onBeforeCompile: shader => {
          shader.uniforms.actionRatio = impacts[idx].trailRatio;
          shader.uniforms.lineLength = impacts[idx].trailLength;
          shader.fragmentShader = lineFragmentShader;
        }
      });
      let l = new THREE.Line(g, m);
      l.userData.idx = idx;
      setPath(l, impacts[idx].prevPosition, impacts[idx].impactPosition, 1);
      trails.push(l);
    }

    function setPath(l, startPoint, endPoint, peakHeight, cycles) {
      let pos = l.geometry.attributes.position;
      let division = pos.count - 1;
      let cycle = cycles || 1;
      let peak = peakHeight || 1;
      let radius = startPoint.length();
      let angle = startPoint.angleTo(endPoint);
      let arcLength = radius * angle;
      let diameterMinor = arcLength / Math.PI;
      let radiusMinor = (diameterMinor * 0.5) / cycle;
      let peakRatio = peak / diameterMinor;
      let radiusMajor = startPoint.length() + radiusMinor;
      let basisMajor = new THREE.Vector3().copy(startPoint).setLength(radiusMajor);
      let basisMinor = new THREE.Vector3().copy(startPoint).negate().setLength(radiusMinor);
      let tri = new THREE.Triangle(startPoint, endPoint, new THREE.Vector3());
      let nrm = new THREE.Vector3();
      tri.getNormal(nrm);
      let v3Major = new THREE.Vector3();
      let v3Minor = new THREE.Vector3();
      let v3Inter = new THREE.Vector3();
      let vFinal = new THREE.Vector3();
      for (let i = 0; i <= division; i++) {
        let divisionRatio = i / division;
        let angleValue = angle * divisionRatio;
        v3Major.copy(basisMajor).applyAxisAngle(nrm, angleValue);
        v3Minor.copy(basisMinor).applyAxisAngle(nrm, angleValue + Math.PI * 2 * divisionRatio * cycle);
        v3Inter.addVectors(v3Major, v3Minor);
        let newLength = ((v3Inter.length() - radius) * peakRatio) + radius;
        vFinal.copy(v3Inter).setLength(newLength);
        pos.setXYZ(i, vFinal.x, vFinal.y, vFinal.z);
      }
      pos.needsUpdate = true;
      l.computeLineDistances();
      l.geometry.attributes.lineDistance.needsUpdate = true;
      impacts[l.userData.idx].trailLength.value = l.geometry.attributes.lineDistance.array[99];
      l.material.dashSize = 3;
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( window.innerWidth, window.innerHeight );
    }
  }

  initChart = () => {
    const chart_1 = echarts.init(document.getElementsByClassName('chart_1')[0], 'dark');
    chart_1 && chart_1.setOption(chart_1_option);

    const chart_2 = echarts.init(document.getElementsByClassName('chart_2')[0], 'dark');
    chart_2 && chart_2.setOption(chart_2_option);

    const chart_3 = echarts.init(document.getElementsByClassName('chart_3')[0], 'dark');
    chart_3 && chart_3.setOption(chart_3_option);

    const chart_4 = echarts.init(document.getElementsByClassName('chart_4')[0], 'dark');
    chart_4 && chart_4.setOption(chart_4_option);

    const chart_5 = echarts.init(document.getElementsByClassName('chart_5')[0], 'dark');
    chart_5 && chart_5.setOption(chart_5_option);
  }

  updateTime = () => {
    this.timeInterval = setInterval(() => {
      let date = new Date();
      let hours = date.getHours();
      let minutes = date.getMinutes();
      let seconds = date.getSeconds();
      let time = `${hours < 10 ? '0' + hours : hours }:${minutes < 10 ? '0' + minutes : minutes }:${seconds < 10 ? '0' + seconds : seconds}`;
      this.setState({
        time: time
      })
    }, 1000);
  }

  handleModalClick = () =>  {
    setTimeout(() => {
      this.setState({
        showModal: false
      })
    })
  }

  render () {
    return (
      <div className='earth_digital'>
        <canvas className='webgl'></canvas>
        <div className='tips_modal' style={{ 'display': this.state.showModal ? 'block': 'none' }}>
          <div className='tips'><p className='text'>{ this.state.modelText }</p></div>
          <i className='close' onClick={this.handleModalClick.bind(this)}>CLOSE</i>
        </div>
        <header className='hud header'>
          <div className='left'>
            <p className='date'>
              <span className='text'>{ `${this.state.week}曜日` }</span>
              <span className='text'>{ this.state.time }</span>
              <span className='text'>Kepler-90 +49°18′18.58″</span>
            </p>
          </div>
          <div className='middle'></div>
          <div className='right'>
            <a className='github' href='https://github.com/dragonir/3d' target='_blank' rel='noreferrer'>
              <span className='author'>DRAGONIR</span>
              <svg className='github' height='32' aria-hidden='true' viewBox='0 0 16 16' version='1.1' width='32' data-view-component='true'>
                <path fill='#000000' fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
            </a>
          </div>
        </header>
        <div className='logo'></div>
        <aside className='hud aside left'>
          <div className='box box_0 inverse'>
            <div className='cover'></div>
            <div className='info'>
              <p className='text'><b>Cyberpunk</b> is a subgenre of science fiction in a dystopian futuristic setting that tends to focus on a "combination of lowlife and high tech", featuring futuristic technological and scientific achievements, such as artificial intelligence and cybernetics, juxtaposed with societal collapse or decay. </p>
              <button className='button'>START</button>
            </div>
          </div>
          <div className='box'><div className='chart chart_1'></div></div>
          <div className='box inverse dotted'><div className='chart chart_2'></div></div>
        </aside>
        <aside className='hud aside right'>
          <div className='box'><div className='chart chart_3'></div></div>
          <div className='box'><div className='chart chart_4'></div></div>
          <div className='box inverse dotted'><div className='chart chart_5'></div></div>
        </aside>
        <div className='hud footer'>
          <div className='square'>
            <div className='radar'></div>
            <div className='text'>
              <p className='title'>5024.88</p>
              <p className='description'>距离</p>
            </div>
          </div>
          <div className='square'>
            <div className='radar'></div>
            <div className='text'>
              <p className='title'>0.00025%</p>
              <p className='description'>含氧量</p>
            </div>
          </div>
          <div className='square'>
            <div className='radar'></div>
            <div className='text'>
              <p className='title'>2077.77</p>
              <p className='description'>辐射</p>
            </div>
          </div>
        </div>
        <section className="bg"></section>
      </div>
    )
  }
}