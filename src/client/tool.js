/**
 * Components related to tools.
 *
 * @module client/tool
 * @flow
 */

import * as React from 'react';
import * as ReactRedux from 'react-redux';
import {FormattedMessage} from 'react-intl';
import {Nav, Button, ButtonGroup, UncontrolledTooltip} from 'reactstrap';
import {library} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay} from '@fortawesome/free-solid-svg-icons/faPlay';
import {faPause} from '@fortawesome/free-solid-svg-icons/faPause';
import {faStop} from '@fortawesome/free-solid-svg-icons/faStop';
import {faFastBackward} from '@fortawesome/free-solid-svg-icons/faFastBackward';
import {faFastForward} from '@fortawesome/free-solid-svg-icons/faFastForward';
import {faMousePointer} from '@fortawesome/free-solid-svg-icons/faMousePointer';
import {faExpand} from '@fortawesome/free-solid-svg-icons/faExpand';
import {faMagic} from '@fortawesome/free-solid-svg-icons/faMagic';
import {faArrowsAlt} from '@fortawesome/free-solid-svg-icons/faArrowsAlt';
import {faSyncAlt} from '@fortawesome/free-solid-svg-icons/faSyncAlt';
import {faCompress} from '@fortawesome/free-solid-svg-icons/faCompress';
import {faEraser} from '@fortawesome/free-solid-svg-icons/faEraser';
import {faDotCircle} from '@fortawesome/free-solid-svg-icons/faDotCircle';
import {faPencilAlt} from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import {faDrawPolygon} from '@fortawesome/free-solid-svg-icons/faDrawPolygon';
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons/faCircleNotch';
import {faBezierCurve} from '@fortawesome/free-solid-svg-icons/faBezierCurve';
import {faProjectDiagram} from '@fortawesome/free-solid-svg-icons/faProjectDiagram';
import {faVectorSquare} from '@fortawesome/free-solid-svg-icons/faVectorSquare';
import {faStamp} from '@fortawesome/free-solid-svg-icons/faStamp';
import type {ToolType} from './store';
import {StoreActions, store} from './store';
import type {LineSegment} from './util/math';
import type {Renderer} from './renderer/util';
import type {HoverType} from './renderer/helpers';
import {
  renderRectangle,
  renderTranslationHandle,
  renderRotationHandle,
  renderScaleHandle,
} from './renderer/helpers';
import type {Resource} from '../server/store/resource';
import {Scene} from '../server/store/scene';
import type {Transform} from '../server/store/math';
import {
  getTransformTranslation,
  plusEquals,
  timesEquals,
} from '../server/store/math';

library.add(faPlay);
library.add(faPause);
library.add(faStop);
library.add(faFastBackward);
library.add(faFastForward);
library.add(faMousePointer);
library.add(faExpand);
library.add(faMagic);
library.add(faArrowsAlt);
library.add(faSyncAlt);
library.add(faCompress);
library.add(faEraser);
library.add(faDotCircle);
library.add(faPencilAlt);
library.add(faDrawPolygon);
library.add(faCircleNotch);
library.add(faBezierCurve);
library.add(faProjectDiagram);
library.add(faVectorSquare);
library.add(faStamp);

/**
 * The set of tools available.
 */
export const Toolset = ReactRedux.connect(state => ({
  resource: state.resource,
  selection: state.selection,
  tool: state.tool,
}))(
  (props: {
    resource: ?Resource,
    selection: Set<string>,
    tool: ToolType,
    renderer: ?Renderer,
  }) => {
    const {tool, ...toolProps} = props;
    return (
      <div>
        <Nav
          tabs
          className="pt-2 bg-black play-controls justify-content-center">
          <ButtonGroup>
            <PlayControl icon="play" />
            <PlayControl icon="pause" disabled />
            <PlayControl icon="stop" disabled />
            <PlayControl icon="fast-backward" disabled />
            <PlayControl icon="fast-forward" disabled />
          </ButtonGroup>
        </Nav>
        <div className="border-bottom border-secondary text-center pt-3 pb-3">
          <div className="tool-grid">
            <ButtonGroup>
              <SelectPanTool activeTool={tool} {...toolProps} />
              <RectSelectTool activeTool={tool} {...toolProps} />
              <ContiguousSelectTool activeTool={tool} {...toolProps} />
              <TranslateTool activeTool={tool} {...toolProps} />
              <RotateTool activeTool={tool} {...toolProps} />
            </ButtonGroup>
            <ButtonGroup>
              <ScaleTool activeTool={tool} {...toolProps} />
              <EraseTool activeTool={tool} {...toolProps} />
              <PointTool activeTool={tool} {...toolProps} />
              <LineTool activeTool={tool} {...toolProps} />
              <LineGroupTool activeTool={tool} {...toolProps} />
            </ButtonGroup>
            <ButtonGroup>
              <PolygonTool activeTool={tool} {...toolProps} />
              <RectangleTool activeTool={tool} {...toolProps} />
              <EllipseArcTool activeTool={tool} {...toolProps} />
              <BezierTool activeTool={tool} {...toolProps} />
              <StampTool activeTool={tool} {...toolProps} />
            </ButtonGroup>
          </div>
        </div>
      </div>
    );
  },
);

function PlayControl(props: {icon: string, disabled?: boolean}) {
  return (
    <Button color="link" disabled={props.disabled}>
      <FontAwesomeIcon icon={props.icon} />
    </Button>
  );
}

type ToolProps = {
  activeTool: ToolType,
  resource: ?Resource,
  selection: Set<string>,
  renderer: ?Renderer,
};

class Tool extends React.Component<ToolProps, {}> {
  _type: ToolType;
  _icon: string;
  _name: React.Element<any>;

  /** Checks whether the tool is active. */
  get active(): boolean {
    return this.props.activeTool === this._type;
  }

  constructor(
    type: ToolType,
    icon: string,
    name: React.Element<any>,
    ...args: any[]
  ) {
    super(...args);
    this._type = type;
    this._icon = icon;
    this._name = name;
  }

  render() {
    return [
      <Button
        key="button"
        id={this._type}
        color="primary"
        active={this.active}
        onClick={() => store.dispatch(StoreActions.setTool.create(this._type))}>
        <FontAwesomeIcon icon={this._icon} />
      </Button>,
      <UncontrolledTooltip
        key="tooltip"
        delay={{show: 750, hide: 0}}
        target={this._type}>
        {this._name}
      </UncontrolledTooltip>,
    ];
  }

  componentDidMount() {
    this.props.renderer && this._subscribeToRenderer(this.props.renderer);
  }

  componentWillUnmount() {
    this.props.renderer && this._unsubscribeFromRenderer(this.props.renderer);
  }

  componentDidUpdate(prevProps: ToolProps) {
    const renderer = this.props.renderer;
    if (prevProps.renderer !== renderer) {
      prevProps.renderer && this._unsubscribeFromRenderer(prevProps.renderer);
      renderer && this._subscribeToRenderer(renderer);
    } else if (renderer) {
      const wasActive = prevProps.activeTool === this._type;
      if (wasActive !== this.active) {
        wasActive ? this._onDeactivate(renderer) : this._onActivate(renderer);
      }
    }
  }

  _subscribeToRenderer(renderer: Renderer) {
    renderer.addRenderCallback(this._renderHelpers);
    renderer.canvas.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('mousemove', this._onMouseMove);
    renderer.canvas.addEventListener('wheel', this._onWheel);
    this.active && this._onActivate(renderer);
  }

  _unsubscribeFromRenderer(renderer: Renderer) {
    renderer.removeRenderCallback(this._renderHelpers);
    renderer.canvas.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    renderer.canvas.removeEventListener('wheel', this._onWheel);
    this.active && this._onDeactivate(renderer);
  }

  _onActivate(renderer: Renderer) {
    // nothing by default
  }

  _onDeactivate(renderer: Renderer) {
    // nothing by default
  }

  _renderHelpers = (renderer: Renderer) => {
    // nothing by default
  };

  _onMouseDown = (event: MouseEvent) => {
    // nothing by default
  };

  _onMouseUp = (event: MouseEvent) => {
    // nothing by default
  };

  _onMouseMove = (event: MouseEvent) => {
    // nothing by default
  };

  _onWheel = (event: WheelEvent) => {
    // nothing by default
  };
}

class SelectPanTool extends Tool {
  _panning = false;

  constructor(...args: any[]) {
    super(
      'selectPan',
      'mouse-pointer',
      <FormattedMessage id="tool.select_pan" defaultMessage="Select/Pan" />,
      ...args,
    );
  }

  _onMouseDown = (event: MouseEvent) => {
    if (this.active && event.button === 0) {
      (document.body: any).style.cursor = 'all-scroll';
      this._panning = true;
    }
  };

  _onMouseUp = (event: MouseEvent) => {
    if (this._panning) {
      (document.body: any).style.cursor = null;
      this._panning = false;
    }
  };

  _onMouseMove = (event: MouseEvent) => {
    const renderer = this.props.renderer;
    if (!(renderer && this._panning)) {
      return;
    }
    const camera = renderer.camera;
    const pixelsToWorldUnits = renderer.pixelsToWorldUnits;
    store.dispatch(
      StoreActions.setPagePosition.create(
        camera.x - event.movementX * pixelsToWorldUnits,
        camera.y + event.movementY * pixelsToWorldUnits,
      ),
    );
  };

  _onWheel = (event: WheelEvent) => {
    const renderer = this.props.renderer;
    if (!renderer) {
      return;
    }
    store.dispatch(
      StoreActions.setPageSize.create(
        renderer.camera.size * Math.pow(1.01, event.deltaY),
      ),
    );
  };
}

class RectSelectTool extends Tool {
  _rect: ?LineSegment;

  constructor(...args: any[]) {
    super(
      'rectSelect',
      'expand',
      <FormattedMessage id="tool.rect_select" defaultMessage="Rect Select" />,
      ...args,
    );
  }

  _onActivate(renderer: Renderer) {
    renderer.canvas.style.cursor = 'crosshair';
  }

  _onDeactivate(renderer: Renderer) {
    renderer.canvas.style.cursor = 'inherit';
  }

  _renderHelpers = (renderer: Renderer) => {
    this._rect && renderRectangle(renderer, this._rect, '#00bc8c');
  };

  _onMouseDown = (event: MouseEvent) => {
    const renderer = this.props.renderer;
    if (this.active && event.button === 0 && renderer) {
      const position = renderer.getWorldPosition(event.offsetX, event.offsetY);
      this._rect = {start: position, end: position};
    }
  };

  _onMouseUp = (event: MouseEvent) => {
    if (this._rect && this.props.renderer) {
      this._rect = null;
      this.props.renderer.requestFrameRender();
    }
  };

  _onMouseMove = (event: MouseEvent) => {
    const renderer = this.props.renderer;
    if (!(renderer && this._rect)) {
      return;
    }
    const canvasRect = renderer.canvas.getBoundingClientRect();
    const position = renderer.getWorldPosition(
      event.clientX - canvasRect.left,
      event.clientY - canvasRect.top,
    );
    this._rect = Object.assign({}, this._rect, {end: position});
    renderer.requestFrameRender();
  };
}

class ContiguousSelectTool extends Tool {
  constructor(...args: any[]) {
    super(
      'contiguousSelect',
      'magic',
      <FormattedMessage
        id="tool.contiguous_select"
        defaultMessage="Contiguous Select"
      />,
      ...args,
    );
  }
}

class HandleTool extends Tool {
  get _shouldRender(): boolean {
    return this.active;
  }

  _renderHelpers = (renderer: Renderer) => {
    const resource = this.props.resource;
    const selectionSize = this.props.selection.size;
    if (
      !(this._shouldRender && selectionSize > 0 && resource instanceof Scene)
    ) {
      return;
    }
    const transforms: Transform[] = [];
    const totalTranslation = {x: 0.0, y: 0.0};
    for (const id of this.props.selection) {
      const transform = resource.getWorldTransform(id);
      plusEquals(totalTranslation, getTransformTranslation(transform));
    }
    this._renderHandle(
      renderer,
      {translation: timesEquals(totalTranslation, 1.0 / selectionSize)},
      null,
    );
  };

  _renderHandle(renderer: Renderer, transform: Transform, hover: ?HoverType) {
    throw new Error('Not implemented.');
  }
}

class TranslateTool extends HandleTool {
  get _shouldRender(): boolean {
    return (
      this.props.activeTool !== 'rotate' && this.props.activeTool !== 'scale'
    );
  }

  constructor(...args: any[]) {
    super(
      'translate',
      'arrows-alt',
      <FormattedMessage id="tool.translate" defaultMessage="Translate" />,
      ...args,
    );
  }

  _renderHandle(renderer: Renderer, transform: Transform, hover: ?HoverType) {
    renderTranslationHandle(renderer, transform, hover);
  }
}

class RotateTool extends HandleTool {
  constructor(...args: any[]) {
    super(
      'rotate',
      'sync-alt',
      <FormattedMessage id="tool.rotate" defaultMessage="Rotate" />,
      ...args,
    );
  }

  _renderHandle(renderer: Renderer, transform: Transform, hover: ?HoverType) {
    renderRotationHandle(renderer, transform, hover);
  }
}

class ScaleTool extends HandleTool {
  constructor(...args: any[]) {
    super(
      'scale',
      'compress',
      <FormattedMessage id="tool.scale" defaultMessage="Scale" />,
      ...args,
    );
  }

  _renderHandle(renderer: Renderer, transform: Transform, hover: ?HoverType) {
    renderScaleHandle(renderer, transform, hover);
  }
}

class EraseTool extends Tool {
  constructor(...args: any[]) {
    super(
      'erase',
      'eraser',
      <FormattedMessage id="tool.erase" defaultMessage="Erase" />,
      ...args,
    );
  }
}

class PointTool extends Tool {
  constructor(...args: any[]) {
    super(
      'point',
      'dot-circle',
      <FormattedMessage id="tool.point" defaultMessage="Point" />,
      ...args,
    );
  }
}

class LineTool extends Tool {
  constructor(...args: any[]) {
    super(
      'line',
      'pencil-alt',
      <FormattedMessage id="tool.line" defaultMessage="Line" />,
      ...args,
    );
  }
}

class LineGroupTool extends Tool {
  constructor(...args: any[]) {
    super(
      'lineGroup',
      'project-diagram',
      <FormattedMessage id="tool.line_group" defaultMessage="Line Group" />,
      ...args,
    );
  }
}

class PolygonTool extends Tool {
  constructor(...args: any[]) {
    super(
      'polygon',
      'draw-polygon',
      <FormattedMessage id="tool.polygon" defaultMessage="Polygon" />,
      ...args,
    );
  }
}

class RectangleTool extends Tool {
  constructor(...args: any[]) {
    super(
      'rectangle',
      'vector-square',
      <FormattedMessage id="tool.rectangle" defaultMessage="Rectangle" />,
      ...args,
    );
  }
}

class EllipseArcTool extends Tool {
  constructor(...args: any[]) {
    super(
      'ellipseArc',
      'circle-notch',
      <FormattedMessage id="tool.ellipse_arc" defaultMessage="Ellipse/Arc" />,
      ...args,
    );
  }
}

class BezierTool extends Tool {
  constructor(...args: any[]) {
    super(
      'bezier',
      'bezier-curve',
      <FormattedMessage id="tool.bezier" defaultMessage="Bezier" />,
      ...args,
    );
  }
}

class StampTool extends Tool {
  constructor(...args: any[]) {
    super(
      'stamp',
      'stamp',
      <FormattedMessage id="tool.stamp" defaultMessage="Clone Stamp" />,
      ...args,
    );
  }
}
