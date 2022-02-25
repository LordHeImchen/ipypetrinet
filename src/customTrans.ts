// Copyright (c) Jakob Bucksch
// Distributed under the terms of the Modified BSD License.

import * as joint from '../node_modules/jointjs/dist/joint';

// Extending the joint.shapes.pn.Transition:
// Set some constants to structure it clearly
const PADDING_S = 4;
const PADDING_L = 4;
const FONT_FAMILY = 'sans-serif';
const LIGHT_COLOR = '#FFF';
const DARK_COLOR = '#333';
const ACTION_COLOR = '#7c68fc';
const LINE_WIDTH = 2;
const HEADER_HEIGHT = 15;
const LIST_MAX_PORT_COUNT = 5;
const LIST_GROUP_NAME = 'conditions';
const LIST_ITEM_HEIGHT = 23;
const LIST_ITEM_WIDTH = 120;
const LIST_ITEM_LABEL = 'Condition Item';
const LIST_ITEM_GAP = 1;
const LIST_BUTTON_RADIUS = 16;
const LIST_ADD_BUTTON_SIZE = 20;
const LIST_REMOVE_BUTTON_SIZE = 16;

const itemPosition = (portsArgs: joint.dia.Element.Port[], elBBox: joint.dia.BBox): joint.g.Point[] => {
  return portsArgs.map((_port: joint.dia.Element.Port, index: number, { length }) => {
      const bottom = elBBox.height - (LIST_ITEM_HEIGHT + LIST_ADD_BUTTON_SIZE) / 2 - PADDING_S;
      const y = (length - 1 - index) * (LIST_ITEM_HEIGHT + LIST_ITEM_GAP);
      return new joint.g.Point(0, bottom - y);
  });
};
const conditionAttributes = {
  attrs: {
    portBody: {
      width: 'calc(w)',
      height: 'calc(h)',
      x: '2',
      y: 'calc(-0.5*h)',
      fill: '#333',
      rx: 3,
      ry: 3
    },
    portRemoveButton: {
      cursor: 'pointer',
      event: 'element:port:remove',
      transform: `translate(${PADDING_L},0)`,
      title: 'Remove Condition'
    },
    portRemoveButtonBody: {
        width: LIST_REMOVE_BUTTON_SIZE,
        height: LIST_REMOVE_BUTTON_SIZE,
        x: 1,
        y: -LIST_REMOVE_BUTTON_SIZE / 2,
        fill: LIGHT_COLOR,
        rx: LIST_BUTTON_RADIUS,
        ry: LIST_BUTTON_RADIUS
    },
    portRemoveButtonIcon: {
      d: 'M 5 -4 13 4 M 5 4 13 -4',
      stroke: DARK_COLOR,
      strokeWidth: LINE_WIDTH
    },
    portLabel: {
      pointerEvents: 'none',
      fontFamily: FONT_FAMILY,
      fontWeight: 400,
      fontSize: 10,
      fill: LIGHT_COLOR,
      textAnchor: 'start',
      textVerticalAnchor: 'middle',
      textWrap: {
          width: - LIST_REMOVE_BUTTON_SIZE - PADDING_L - 2 * PADDING_S,
          maxLineCount: 1,
          ellipsis: true
      },
      x: PADDING_L + LIST_REMOVE_BUTTON_SIZE + PADDING_S
    },
  },
  size: {
    width: LIST_ITEM_WIDTH,
    height: LIST_ITEM_HEIGHT
  },
  markup: [{
    tagName: 'rect',
    selector: 'portBody'
  }, {
    tagName: 'text',
    selector: 'portLabel',
  }, {
    tagName: 'g',
    selector: 'portRemoveButton',
    children: [{
        tagName: 'rect',
        selector: 'portRemoveButtonBody'
    }, {
        tagName: 'path',
        selector: 'portRemoveButtonIcon'
    }]
  }]
};
const bodyAttributes = {
  attrs: {
      ".root": {
          magnet: true
      },
      body: {
        width: 'calc(w)',
        height: 'calc(h)',
        fill: "#9586fd",
        strokeWidth: LINE_WIDTH + 1,
        stroke: "#7c68fc",
        rx: 3,
        ry: 3,
      },
      label: {
        'text-anchor': 'middle',
        'ref-x': .5,
        'ref-y': -15,
        'ref': 'rect',
        'text': "",
        'fill': '#fe854f',
        'font-size': 12,
        'font-weight': 600,
      },
      portAddButton: {
          title: 'Add Condition',
          cursor: 'pointer',
          event: 'element:port:add',
          transform: `translate(calc(w-${3 * PADDING_S}),calc(h))`,
      },
      portAddButtonBody: {
          width: LIST_ADD_BUTTON_SIZE,
          height: LIST_ADD_BUTTON_SIZE,
          rx: LIST_BUTTON_RADIUS,
          ry: LIST_BUTTON_RADIUS,
          x: -LIST_ADD_BUTTON_SIZE / 2,
          y: -LIST_ADD_BUTTON_SIZE / 2,
      },
      portAddButtonIcon: {
          d: 'M -4 0 4 0 M 0 -4 0 4',
          stroke: LIGHT_COLOR,
          strokeWidth: LINE_WIDTH
      }
  },
  markup: [{
      tagName: 'rect',
      selector: 'body',
  }, {
      tagName: 'text',
      selector: 'label',
  }, {
      tagName: 'g',
      selector: 'portAddButton',
      children: [{
          tagName: 'rect',
          selector: 'portAddButtonBody'
      }, {
          tagName: 'path',
          selector: 'portAddButtonIcon'
      }]
  }]
};
// Actual Extension of the Transition:
export class customTransition extends joint.shapes.pn.Transition {
  defaults() {
    return {
      ...super.defaults,
      ...bodyAttributes,
      type: "customTransition",
      size: { width: LIST_ITEM_WIDTH + 4, height: 0 },
      exectime: "1",
      eventAttrs: [],
      ports: {
        groups: {
          [LIST_GROUP_NAME]: {
            position: itemPosition,
            ...conditionAttributes
          }
        },
        items: []
      }
    }
  }

  initialize(...args: any[]) {
    this.on('change:ports', () => this.resizeToFitPorts());
    this.resizeToFitPorts();
    this.toggleAddPortButton(LIST_GROUP_NAME);
    super.initialize.call(this, ...args);
  }

  resizeToFitPorts() {
    const { length } = this.getPorts();
    this.toggleAddPortButton(LIST_GROUP_NAME);
    const height = HEADER_HEIGHT + (LIST_ITEM_HEIGHT + LIST_ITEM_GAP) * length + PADDING_L;
    this.prop(['size', 'height'], HEADER_HEIGHT + (LIST_ITEM_HEIGHT + LIST_ITEM_GAP) * length + PADDING_L);
    return height
  }

  addDefaultPort(label: string) {
    if (!this.canAddPort(LIST_GROUP_NAME)) return;
    this.addPort({
        group: LIST_GROUP_NAME,
        attrs: { portLabel: { text: label }}
    });
  }

  getDefaultPortName() {
      const ports = this.getGroupPorts(LIST_GROUP_NAME);
      let portName: any;
      let i = 1;
      do {
          portName = `${LIST_ITEM_LABEL} ${i++}`;
      } while (ports.find(port => port.attrs!.portLabel!.text === portName));
      return portName;
  }

  canAddPort(group: string): boolean {
      return Object.keys(this.getGroupPorts(group)).length < LIST_MAX_PORT_COUNT;
  }

  toggleAddPortButton(group: string): void {
      const buttonAttributes = this.canAddPort(group)
          ? { fill: ACTION_COLOR, cursor: 'pointer' }
          : { fill: 'lightgray', cursor: 'not-allowed' };
      this.attr(['portAddButton'], buttonAttributes, {
          isolate: true
      });
  }
}