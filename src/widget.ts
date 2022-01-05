// Copyright (c) Jakob Bucksch
// Distributed under the terms of the Modified BSD License.

import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import * as joint from '../node_modules/jointjs/dist/joint';
import '../css/widget.css';

// this is very important for loading a saved graph (namespace problem)
window.joint = joint;

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
class customTransition extends joint.shapes.pn.Transition {
  defaults() {
    return {
      ...super.defaults,
      ...bodyAttributes,
      type: "customTransition",
      size: { width: LIST_ITEM_WIDTH + 4, height: 0 },
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
// Make sure graph.fromJSON() will find the custom shape
Object.assign(joint.shapes, { customTransition });

export class PetriModel extends DOMWidgetModel {

  defaults() {
    return {
      ...super.defaults(),
      _model_name: PetriModel.model_name,
      _model_module: PetriModel.model_module,
      _model_module_version: PetriModel.model_module_version,
      _view_name: PetriModel.view_name,
      _view_module: PetriModel.view_module,
      _view_module_version: PetriModel.view_module_version,
      graph: [],
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = 'PetriModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'PetriView';                  // Set to null if no view
  static view_module = MODULE_NAME;                // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

export class PetriView extends DOMWidgetView {
  static graph: joint.dia.Graph;
  static selectedCell: any;
  static gridSize: any;
  static paper: joint.dia.Paper;
  static backupTokens: any;
  static dragStartPosition: any;
  simulationId: any;
  width: any;
  height: any;

  render() {
    // DROPDOWN GRAPH-BUTTON
    var dropdown = document.createElement("div");
    dropdown.className = "dropdown";
    
    var graphsButton = document.createElement("button");
    graphsButton.className = "button button2";
    graphsButton.innerHTML = '<i class="fa fa-list"></i>' + " Graphs";

    var dropdownContent = document.createElement("div");
    dropdownContent.id = "dropdown-content";
    dropdownContent.className = "dropdown-content";

    var firstExample = document.createElement("a");
    firstExample.textContent = "Example 1";
    firstExample.addEventListener("click", (e:Event) => this.firstExample());
    var secondExample = document.createElement("a");
    secondExample.textContent = "Example 2";
    secondExample.addEventListener("click", (e:Event) => this.secondExample());

    dropdownContent.appendChild(firstExample);
    dropdownContent.appendChild(secondExample);
    dropdown.appendChild(graphsButton);
    dropdown.appendChild(dropdownContent);

    // BUTTONS
    var addToken = document.createElement("button");
    addToken.className = "button button1";
    addToken.addEventListener("click", (e:Event) => this.addToken());
    addToken.innerHTML = '<i class="fa fa-plus"></i>';

    var removeToken = document.createElement("button");
    removeToken.className = "button button1";
    removeToken.addEventListener("click", (e:Event) => this.removeToken());
    removeToken.innerHTML = '<i class="fa fa-minus"></i>';

    var addPlace = document.createElement("button");
    addPlace.className = "button button1";
    addPlace.addEventListener("click", (e:Event) => this.addPlace());
    addPlace.innerHTML = '<i class="fa fa-plus"></i>' + " Place";
    
    var addTrans = document.createElement("button");
    addTrans.className = "button button1";
    addTrans.addEventListener("click", (e:Event) => this.addTrans());
    addTrans.innerHTML = '<i class="fa fa-plus"></i>' + " Transition";

    var removeCell = document.createElement("button");
    removeCell.className = "button button1";
    removeCell.addEventListener("click", (e:Event) => this.removeCell());
    removeCell.innerHTML = '<i class="fa fa-trash"></i>' + " Remove";

    var clearAll = document.createElement("button");
    clearAll.className = "button button1";
    clearAll.addEventListener("click", (e:Event) => this.clearAll());
    clearAll.innerHTML = '<i class="fa fa-eraser"></i>' + " Clear";

    var simulate = document.createElement("button");
    simulate.className = "button button1";
    simulate.addEventListener("click", (e:Event) => this.simulate());
    simulate.innerHTML = '<i class="fa fa-caret-right icon-large"></i>' + " Play";

    var stopSimulation = document.createElement("button");
    stopSimulation.className = "button button1";
    stopSimulation.addEventListener("click", (e:Event) => this.stopSimulation());
    stopSimulation.innerHTML = '<i class="fa fa-stop"></i>' + " Stop";

    var lockModel = document.createElement("button");
    lockModel.className = "button button1";
    lockModel.id = "lock";
    lockModel.addEventListener("click", (e:Event) => this.lockModel());
    lockModel.innerHTML = '<i class="fa fa-unlock"></i>' + " Lock";

    var reloadSim = document.createElement("button");
    reloadSim.className = "button button1";
    reloadSim.addEventListener("click", (e:Event) => this.resetSim());
    reloadSim.innerHTML = '<i class="fa fa-refresh"></i>' + " Reset";

    var saveGraph = document.createElement("button");
    saveGraph.className = "button button2";
    saveGraph.addEventListener("click", (e:Event) => PetriView.showPopup("savePopup"));
    saveGraph.innerHTML = '<i class="fa fa-save"></i>' + " Save Graph";

    var saveIMG = document.createElement("button");
    saveIMG.className = "button button2";
    saveIMG.addEventListener("click", (e:Event) => this.saveIMG());
    saveIMG.innerHTML = '<i class="fa fa-download"></i>' + " Download SVG";

    var importJSON = document.createElement("button");
    importJSON.className = "button button2";
    importJSON.addEventListener("click", (e:Event) => PetriView.showPopup("uploadPopup"));
    importJSON.innerHTML = '<i class="fa fa-upload"></i>' + " Import JSON";

    var downloadJSON = document.createElement("button");
    downloadJSON.className = "button button2";
    downloadJSON.addEventListener("click", (e:Event) => this.downloadJSON());
    downloadJSON.innerHTML = '<i class="fa fa-download"></i>' + " Download JSON";

    var zoomIn = document.createElement("button");
    zoomIn.className = "button button2";
    zoomIn.addEventListener("click", (e:Event) => PetriView.zoomIt(1));
    zoomIn.innerHTML = '<i class="fa fa-search-plus"></i>' + " Zoom in";

    var zoomOut = document.createElement("button");
    zoomOut.className = "button button2";
    zoomOut.addEventListener("click", (e:Event) => PetriView.zoomIt(-1));
    zoomOut.innerHTML = '<i class="fa fa-search-minus"></i>' + " Zoom out";

    // UPLOAD-POPUP
    var uploadPopup = document.createElement("div");
    uploadPopup.id = "uploadPopup";
    uploadPopup.className = "popup";
    uploadPopup.style.display = "none";

    var uploadPopupContent = document.createElement("div");
    uploadPopupContent.className = "popup-content";

    var fileInput = document.createElement("input");
    fileInput.className = "fileinput";
    fileInput.id = "fileInput";
    fileInput.type = "file";
    fileInput.accept = "application/JSON";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", (e:Event) => this.showFileName());

    var label = document.createElement("label");
    label.htmlFor = "fileInput";
    label.textContent = "Select a JSON-File...";

    var uploadJSON = document.createElement("button");
    uploadJSON.id = "uploadJSON";
    uploadJSON.className = "button button1";
    uploadJSON.textContent = "Import Graph!";
    uploadJSON.addEventListener("click", (e:Event) => PetriView.importJSON());

    uploadPopupContent.appendChild(label);
    uploadPopupContent.appendChild(fileInput);
    uploadPopupContent.appendChild(uploadJSON);
    uploadPopup.appendChild(uploadPopupContent);

    // LINK-POPUP
    var linkPopup = document.createElement("div");
    linkPopup.id = "linkPopup";
    linkPopup.className = "popup";
    linkPopup.style.display = "none";

    var linkInput = document.createElement("input");
    linkInput.placeholder = "Enter probability...";
    linkInput.id = "linkInput";
    linkInput.type = "number";
    linkInput.step = "0.01";
    linkInput.min = "0.00";
    linkInput.max = "1.00";
    linkInput.defaultValue = "1.00";

    var changeProb = document.createElement("button");
    changeProb.id = "changeProb";
    changeProb.className = "button button1";
    changeProb.addEventListener("click", (e:Event) => PetriView.changeProb());
    changeProb.textContent = "Change Probability!"

    var linkPopupContent = document.createElement("div");
    linkPopupContent.className = "popup-content";

    linkPopupContent.appendChild(linkInput);
    linkPopupContent.appendChild(changeProb);
    linkPopup.appendChild(linkPopupContent);

    // LABEL-POPUP
    var popup = document.createElement("div");
    popup.id = "popup";
    popup.className = "popup";
    popup.style.display = "none";

    var p = document.createElement("p");
    p.textContent = "Label:";

    var input = document.createElement("input");
    input.placeholder = "Enter label...";
    input.id = "input";
    input.type = "text";
    input.oninput = this.enableLabelButton;

    var changeLabel = document.createElement("button");
    changeLabel.id = "changelabel";
    changeLabel.className = "button button1";
    changeLabel.addEventListener("click", (e:Event) => PetriView.saveChanges());
    changeLabel.disabled = true;
    changeLabel.textContent = "Save Label!";
    
    var popupContent = document.createElement("div");
    popupContent.className = "popup-content";

    popupContent.appendChild(p);
    popupContent.appendChild(input);
    popupContent.appendChild(changeLabel);
    popup.appendChild(popupContent);

    // CONDITION-POPUP
    var condPopup = document.createElement("div");
    condPopup.className = "popup";
    condPopup.id = "condPopup";
    condPopup.style.display = "none";

    var description = document.createElement("p");
    description.textContent = "Add conditions:"
    description.id = "descriptionID";

    var conditions = document.createElement("input");
    conditions.placeholder = "E.g.: costs > 500, ...";
    conditions.id = "conditionInput";

    var addConditions = document.createElement("button");
    addConditions.id = "addConditions";
    addConditions.className = "button button1";
    addConditions.textContent = "Add Conditions!";
    addConditions.addEventListener("click", (e:Event) => PetriView.saveConditions())

    var condPopupContent = document.createElement("div");
    condPopupContent.className = "popup-content";

    condPopupContent.appendChild(description);
    condPopupContent.appendChild(conditions);
    condPopupContent.appendChild(addConditions);
    condPopup.appendChild(condPopupContent);

    // SAVE-POPUP
    var savePopup = document.createElement("div");
    savePopup.id = "savePopup";
    savePopup.className = "popup";
    savePopup.style.display = "none";

    var savePopupContent = document.createElement("div");
    savePopupContent.className = "popup-content";

    var saveInput = document.createElement("input");
    saveInput.placeholder = "Enter graphname...";
    saveInput.id = "graphNameInput";
    saveInput.type = "text";
    saveInput.oninput = this.enableSaveButton;

    var saveGraphAs = document.createElement("button");
    saveGraphAs.id = "saveGraphAs";
    saveGraphAs.className = "button button1";
    saveGraphAs.addEventListener("click", (e:Event) => PetriView.saveGraph());
    saveGraphAs.disabled = true;
    saveGraphAs.textContent = "Save Graph!";

    savePopupContent.appendChild(saveInput);
    savePopupContent.appendChild(saveGraphAs);
    savePopup.appendChild(savePopupContent);

    // ADD EVERYTHING TO NOTEBOOK HTML CODE (Maybe better use this.el.append(dropdown, addToken, ...))
    this.el.appendChild(dropdown);
    this.el.appendChild(saveGraph);
    this.el.appendChild(importJSON);
    this.el.appendChild(saveIMG);
    this.el.appendChild(downloadJSON);
    this.el.appendChild(zoomIn);
    this.el.appendChild(zoomOut);
    this.el.appendChild(addPlace);
    this.el.appendChild(addTrans);
    this.el.appendChild(addToken);
    this.el.appendChild(removeToken);
    this.el.appendChild(removeCell);
    this.el.appendChild(clearAll);
    this.el.appendChild(lockModel);
    this.el.appendChild(simulate);
    this.el.appendChild(stopSimulation);
    this.el.appendChild(reloadSim);


    // this.el.appendChild(dropdown);
    // this.el.appendChild(addToken);
    // this.el.appendChild(removeToken);
    // this.el.appendChild(addPlace);
    // this.el.appendChild(addTrans);
    // this.el.appendChild(removeCell);
    // this.el.appendChild(clearAll);
    // this.el.appendChild(simulate);
    // this.el.appendChild(stopSimulation);
    // this.el.appendChild(lockModel);
    // this.el.appendChild(reloadSim);
    // this.el.appendChild(saveGraph);
    // this.el.appendChild(saveIMG);
    // this.el.appendChild(importJSON);
    // this.el.appendChild(downloadJSON);
    // this.el.appendChild(zoomIn);
    // this.el.appendChild(zoomOut);

    this.el.appendChild(popup);
    this.el.appendChild(linkPopup);
    this.el.appendChild(savePopup);
    this.el.appendChild(uploadPopup);
    this.el.appendChild(condPopup);

    // Init paper, give it the respective ID, restrict its elements moving area and append it
    this.initWidget();
    PetriView.paper.el.id = "paper";
    PetriView.paper.options.restrictTranslate = function(cellView) { return cellView.paper!.getArea(); }
    this.el.appendChild(PetriView.paper.el);

    // if clicked outside of any popup-form, do not display it anymore (under conditions)
    window.onclick = function(event: MouseEvent) {
      if (PetriView.selectedCell) {
        if ((event.target! as Element).className === "popup" && (PetriView.selectedCell.attributes.type != "customTransition" ||
            PetriView.selectedCell.attributes.attrs["body"]["text"] != "")) {
              (event.target! as HTMLDivElement).style.display = "none";
              $("#changelabel").prop("disabled", true);
              PetriView.selectedCell = null;
        }
      } // to disable savegraph-popup:
        else if ((event.target! as Element).className == "popup") {
        (event.target! as HTMLDivElement).style.display = "none";
        (<HTMLInputElement> document.getElementById("graphNameInput"))!.value = "";
        $("#saveGraphAs").prop("disabled", true);
      }
    }

    // Click popup-buttons on keyboardinput "enter"
    document.addEventListener("keydown", function(e) {
      if (e.key == "Enter") {
        if (popup.style.display != "none" && !(<HTMLButtonElement> document.getElementById("changelabel")!).disabled) {
          PetriView.saveChanges();
        }
        else if (savePopup.style.display != "none" && !(<HTMLButtonElement> document.getElementById("saveGraphAs")!).disabled) {
          PetriView.saveGraph();
        }
        else if (uploadPopup.style.display != "none") {
          PetriView.importJSON();
        }
        else if (condPopup.style.display != "none") {
          PetriView.saveConditions();
        }
        else if (linkPopup.style.display != "none") {
          PetriView.changeProb();
        }
      }
    });

    // Paper on-click, -doubleclick, -drag, -alt-drag and on-hover functionalities
    PetriView.paper.on({
      // while alt-key is pressed cell is locked and you can connect it by dragging with mouseclick
      // otherwise the cell stroke is simply colored red
      'cell:pointerdown': function (this: joint.dia.Paper, cellView: any, evt: any) { 
        if (evt.altKey) {
          jQuery('.joint-element').css("cursor", "crosshair")
          evt.data = cellView.model.position();
          this.findViewByModel(cellView.model).setInteractivity(false);
        } else {
          jQuery('.joint-element').css("cursor", "move");
        }

        // Reset "old" selectedCell-stroke if slectedCell is not the same as cellView
        if (PetriView.selectedCell != null && PetriView.selectedCell != cellView.model) {
          if (PetriView.selectedCell.attributes.type == "pn.Place") {
            PetriView.selectedCell.attr({".root": { "stroke": "#7c68fc" }});
          } else { PetriView.selectedCell.attr({"body": { "stroke": "#7c68fc" }}); }
        }

        if (cellView.model.attributes.type == "pn.Place") {
          cellView.model.attr({".root": { "stroke": (cellView.model.attributes.attrs[".root"]["stroke"] == "red") ? "#7c68fc" : "red" }});
        } else if (cellView.model.attributes.type == "customTransition") {
          cellView.model.attr({"body": { "stroke": (cellView.model.attributes.attrs["body"]["stroke"] == "red") ? "#7c68fc" : "red" }});
        }

        PetriView.selectedCell = cellView.model;
      },

      // if a blank part of paper is clicked, disselect the cell and set dragStartPosition
      'blank:pointerdown': function(evt, x, y) {
        PetriView.dragStartPosition = { x: x, y: y };

        if (PetriView.selectedCell) {
          if (PetriView.selectedCell.attributes.type == "pn.Place") {
            PetriView.selectedCell.attr({".root": { "stroke": "#7c68fc" }});
          } else { PetriView.selectedCell.attr({"body": { "stroke": "#7c68fc" }}); }

          PetriView.selectedCell = null;
        }
      },

      // Reset dragStartPosition
      'blank:pointerup cell:pointerup': function() {
        PetriView.dragStartPosition = null;
      },

      // Make paper draggable (mind the scaling)
      'blank:pointermove element:pointermove': function(event, x, y) {
        if (document.querySelector('#lock')!.textContent == " Lock") {
          if (PetriView.dragStartPosition) {
            var scale = PetriView.paper.scale();
            PetriView.paper.translate(event.offsetX - PetriView.dragStartPosition.x * scale.sx, event.offsetY - PetriView.dragStartPosition.y * scale.sy);
          }
        }
      },

      // when mousebutton is lifted up while altkey is pressed a link is created between source and destination
      // if altkey is not pressed simply unlock the cell again (only if Lock-Button was not pressed)
      'cell:pointerup': function(this: joint.dia.Paper, cellView: any, evt: any, x: any, y: any) {
          jQuery('.joint-element').css("cursor", "move");
          if (document.querySelector('#lock')!.textContent == " Lock") {
            this.findViewByModel(cellView.model).setInteractivity(true);
          }
          if (evt.altKey) {
              var coordinates = new joint.g.Point(x, y);
              var elementAbove = cellView.model;
              var elementBelow = this.model.findModelsFromPoint(coordinates).find(function(cell: joint.dia.Cell) {
                  return (cell.id !== elementAbove.id)
              });
              
              // If the two elements are connected already or have the same cell type, don't connect them (again).
              if ((elementBelow && PetriView.graph.getNeighbors(elementBelow).indexOf(elementAbove) === -1) && 
                  (elementAbove.attributes.type != elementBelow.attributes.type) && (elementAbove.attributes.type != "pn.Link") 
                  && (elementBelow.attributes.type != "pn.Link")) {
                  
                  // Move the cell to the position before dragging and create a connection afterwards.
                  elementAbove.position(evt.data.x, evt.data.y);
                  PetriView.graph.addCell(PetriView.link(elementAbove, elementBelow));
              }
          }
      },

      // Add small remove-options on hover above places and transitions
      'cell:mouseenter': (elementView: joint.dia.ElementView) => {
        if (document.querySelector('#lock')!.textContent == " Lock") {
          var x = "95%"; var y = "30%";
          if (elementView.model.attributes.type == "customTransition") { var x = "98%"; var y = "0%"; }
          if (elementView.model.attributes.type != "pn.Link") {
            elementView.addTools(
                new joint.dia.ToolsView({
                    tools: [
                        new joint.elementTools.Remove({
                        useModelGeometry: true,
                        x: x,
                        y: y,
                        }),
                    ],
                })
            );
          }
        }
      },
      
      // remove small remove-options as soon as mouse leaves the cell
      'element:mouseleave': (elementView: joint.dia.ElementView) => {
          elementView.removeTools();
      },

      // Allow changing the label upon doubleclicking a place or transition
      'cell:pointerdblclick': function() {
        if (PetriView.selectedCell.attributes.type == "pn.Link") {
          PetriView.showPopup("linkPopup");
        } else if (PetriView.selectedCell.attributes.type == "pn.Place" || 
                  (PetriView.selectedCell.attributes.type == "customTransition" && PetriView.selectedCell.attributes.attrs["body"]["text"] != "")) {
          $("#changelabel").prop("disabled", false);
          PetriView.showPopup("popup"); 
        }
      },

      'element:port:remove': function(elementView: joint.dia.ElementView, evt: joint.dia.Event): void {
        evt.stopPropagation();
        const portId = elementView.findAttribute('port', evt.target)!;
        const message = elementView.model as customTransition
        message.removePort(portId);
      },

      'element:port:add': function(elementView: joint.dia.ElementView, evt: joint.dia.Event): void {
        evt.stopPropagation();
        PetriView.selectedCell = elementView.model;

        if (elementView.model.attributes.attrs!["portAddButton"]!["fill"] != "lightgray") {
          PetriView.showPopup("condPopup");
        }
      },
    });

    // UPDATE TYPESCRIPT FROM PYTHON: (alternatively on_some_change)
    this.model.on("change:graph", this.updateGraph, this);

    // UPDATING PYTHON BASED ON TYPESCRIPT
    PetriView.graph.on("change", this.updateGraph.bind(this), this);
  }

  private initWidget() {
    const namespace = joint.shapes
    PetriView.graph = new joint.dia.Graph({ cellNamespace: namespace });
    PetriView.gridSize = 1;
    PetriView.selectedCell = null as any;
    PetriView.backupTokens = null as any;
    this.simulationId = 0;
    this.width = jQuery('#paper').width;
    this.height = jQuery('#paper').height;

    PetriView.paper = new joint.dia.Paper({
      el: document.createElement("div"),
      width: this.width,
      height: this.height,
      gridSize: PetriView.gridSize,
      defaultAnchor: { name: 'perpendicular' },
      defaultConnectionPoint: { name: 'boundary' },
      model: PetriView.graph,
      // background: {color: 'lightgray'},
      cellViewNamespace: namespace,                   // crucial for the tokens to get rendered when jointjs is loaded as a module !!!
      linkPinning: false,                             // prevent dangling links
      snapLabels: true,                               // make link-labels movable along the link
      interactive: {
        "linkMove": true,
        "labelMove": true,
        "arrowheadMove": false,
        "vertexMove": false,
        "vertexAdd": false,
        "vertexRemove": false,
        "useLinkTools": false
      }
    });
  }

  private updateGraph() {
    var allCells = PetriView.graph.getCells();
    allCells.concat(PetriView.graph.getLinks());

    var res: any[] = []
    allCells.forEach(function(cell: any) {
      if (cell.attributes.type == "pn.Place") {
        var id = cell.attributes.id;
        var name = cell.attributes.attrs[".label"]["text"];
        var tokens = cell.attributes.tokens;
        var type = "Place";
        res.push({type, id, name, tokens});
      } else if (cell.attributes.type == "pn.Link") {
        var id = cell.attributes.id;
        var prob = Number(cell.attributes.labels[0]["attrs"]["text"]["text"]);
        var source = cell.attributes.source.id;
        var target = cell.attributes.target.id;
        var type = "Link";
        res.push({type, id, prob, source, target});
      } else if (cell.attributes.type == "customTransition") {
        var id = cell.id;
        var name = cell.attributes.attrs["label"]["text"];
        var type = "Transition";
        var conditions : String[] = [];
        cell.attributes.ports.items.forEach(function(item: any) {
          conditions.push(item["attrs"]["portLabel"]["text"]);
        });
        res.push({type, id, name, conditions});
      }
    });

    this.model.set("graph", res);
    this.model.save_changes();
  }

  private showFileName() {
    var file = (<HTMLInputElement> $('#fileInput')[0]).files![0].name;
    $('#fileInput').prev('label').text(file);
  }

  private static zoomIt(delta: number) {
    var MIN_ZOOM = 0.2;
    var MAX_ZOOM = 3;
    var currentZoom = PetriView.paper.scale().sx;
    if (document.querySelector('#lock')!.textContent == " Lock") {
      var newZoom = currentZoom + 0.2 * delta;
      if (newZoom > MIN_ZOOM && newZoom < MAX_ZOOM) {
        // PetriView.paper.translate(0, 0);
        PetriView.paper.scale(newZoom, newZoom);
      }
    }
  }

  private static getTokenlist(cells: any) {
    var tokenlist: any[] = []
    cells.forEach(function(c: any) {
        if (c.attributes.type == "pn.Place") {
            tokenlist.push(c.get("tokens"));
        }
    });
    return tokenlist
  }

  private firstExample() {
    this.clearAll();

    // Define Places
    var pReady = new joint.shapes.pn.Place({
        position: { x: 140, y: 50 },
        attrs: {
            '.label': {
              'text': 'ready',
              'fill': '#7c68fc',
              'font-size': 20,
              'font-weight': 'bold'
            },
            '.root': {
              'stroke': '#7c68fc',
              'stroke-width': 3,
            },
            '.alot > text': {
              'fill': '#fe854c',
              'font-family': 'Courier New',
              'font-size': 20,
              'font-weight': 'bold',
              'ref-x': 0.5,
              'ref-y': 0.5,
              'y-alignment': -0.5,
              'transform': null as any
            },
            '.tokens > circle': {
              'fill': '#7a7e9b'
            }
        },
        tokens: 1,
    });

    var pIdle = pReady.clone()
        .attr('.label/text', 'idle')
        .position(140, 260)
        .set('tokens', 2);

    var buffer = pReady.clone()
        .position(363, 150)
        .set('tokens', 12)
        .attr({
            '.label': {
                'text': 'buffer'
            },
        });

    var cAccepted = pReady.clone()
        .attr('.label/text', 'accepted')
        .position(600, 50)
        .set('tokens', 1);

    var cReady = pReady.clone()
        .attr('label/text', 'accepted')
        .position(600, 260)
        .set('ready', 3);

    // Define Transitions
    var tProduce = new customTransition({
        position: { x: 20, y: 170 },
        attrs: {
            'label': {
              'text': 'produce',
              'fill': '#fe854f'
            },
        },
    });

    var tSend = tProduce.clone()
        .attr('label/text', 'send')
        .position(180, 170);

    var tAccept = tProduce.clone()
        .attr('label/text', 'accept')
        .position(485, 170);

    var tConsume = tProduce.clone()
        .attr('label/text', 'consume')
        .position(645, 170);

    // add cells to graph and create links
    PetriView.graph.addCell([pReady, pIdle, buffer, cAccepted, cReady, tProduce, tSend, tAccept, tConsume]);
    PetriView.graph.addCell([
      PetriView.link(tProduce, pReady), PetriView.link(pReady, tSend), PetriView.link(tSend, pIdle), PetriView.link(pIdle, tProduce), 
      PetriView.link(tSend, buffer), PetriView.link(buffer, tAccept), PetriView.link(tAccept, cAccepted), 
      PetriView.link(cAccepted, tConsume), PetriView.link(tConsume, cReady), PetriView.link(cReady, tAccept)
    ]);

    PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells())
  }

  private secondExample() {
    this.clearAll();

    var pA1 = new joint.shapes.pn.Place({
        position: { x: 50, y: 150 },
        attrs: {
            '.label': {
              'text': 'A1',
              'fill': '#7c68fc',
              'font-size': 12,
              'font-weight': 'bold'
            },
            '.root': {
              'stroke': '#7c68fc',
              'stroke-width': 3,
            },
            '.alot > text': {
              'fill': '#fe854c',
              'font-family': 'Courier New',
              'font-size': 20,
              'font-weight': 'bold',
              'ref-x': 0.5,
              'ref-y': 0.5,
              'y-alignment': -0.5,
              'transform': null as any
            },
            '.tokens > circle': {
              'fill': '#7a7e9b',
            }
        },
        tokens: 1,
    });

    var pA2 = pA1.clone()
        .attr('.label/text', 'A2')
        .position(200, 150)
        .set('tokens', 0)

    var pConnector = pA1.clone()
        .position(350, 150)
        .attr({
            '.label': {
                'text': 'Connector'
            },
        });

    var pB1 = pA1.clone()
        .attr('.label/text', 'B1')
        .position(650, 150)

    var pB2 = pA1.clone()
        .position(500, 150)
        .set('tokens', 0)
        .attr('.label/text', 'B2')

    // Define Transitions
    var tA1 = new customTransition({
        position: { x: 160, y: 30 },
        attrs: {
            'label': {
                'fill': '#fe854f',
                'text': "Transition A1"
            },
            'body': {
                'fill': '#9586fd',
                'stroke': '#7c68fc'
            },
        },
    });

    var tA2 = tA1.clone()
        .position(160, 300)
        .attr('label/text', 'Transition A2');

    var tB1 = tA1.clone()
        .position(460, 300)
        .attr('label/text', 'Transition B1');

    var tB2 = tA1.clone()
        .position(460, 30)
        .attr('label/text', 'Transition B2');

    // add cells to graph and create links
    PetriView.graph.addCell([pA1, pA2, pConnector, pB1, pB2, tA1, tA2, tB1, tB2]);
    PetriView.graph.addCell([
      PetriView.link(pA1, tA1), PetriView.link(tA1, pA2), PetriView.link(pA2, tA2), PetriView.link(tA2, pA1), PetriView.link(tA2, pConnector),
      PetriView.link(pConnector, tA1), PetriView.link(pConnector, tB1), PetriView.link(tB1, pB2), PetriView.link(pB2, tB2), PetriView.link(tB2, pConnector),
      PetriView.link(tB2, pB1), PetriView.link(pB1, tB1)
    ]);

    PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells())
  }

  private static link(a: any, b: any) {
    return new joint.shapes.pn.Link({
        source: { id: a.id, selector: '.root' },
        target: { id: b.id, selector: '.root' },
        z: -1,
        attrs: { 
          text: {
            fill: '#000000',
            fontSize: 10,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            yAlignment: 'bottom',
            pointerEvents: 'cell:pointerdblclick',
            cursor: "move",
          },
          '.connection': {
              'fill': 'none',
              'stroke-linejoin': 'round',
              'stroke-width': '2',
              'stroke': '#4b4a67', // '#7a7e9b'
          },
        },
        // Hides the standard background-rect of the label
        defaultLabel: {
          markup: [{ tagName: 'text', selector: 'text' }],
          attrs: {
              text: {
                  fill: '#000000',
                  fontSize: 10,
                  textAnchor: 'middle',
                  textVerticalAnchor: 'middle',
                  yAlignment: 'bottom',
                  pointerEvents: 'none'
              }
          },
        },
        labels: [
          {
            attrs: {text: { text: "1.00" }}, 
            position: {args: { keepGradient: true, ensureLegibility: true }}
          }
        ]
    });
  }

  private addToken() {
    try {
      if (PetriView.selectedCell.attributes.type != "pn.Place") {
        return "You cannot add tokens to transitions! Please select a place instead."
        // console.log("You cannot add tokens to transitions! Please select a place instead.");
      } else {
        PetriView.selectedCell.set('tokens', PetriView.selectedCell.get('tokens') + 1);
        PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells())
      }
    } catch(e) {
      return "Nothing selected! Please select a place before adding a token."
    }
  }

  private removeToken() {
    try {
      if (PetriView.selectedCell.attributes.type != "pn.Place") {
          return "You cannot remove tokens from transitions! Please select a place instead."
      } else {
          if (PetriView.selectedCell.get('tokens') > 0) {
            PetriView.selectedCell.set('tokens', PetriView.selectedCell.get('tokens') - 1);
            PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells())
          }
      }
    } catch(e) {
        return "Nothing selected! Please select a place before removing a token."
    }
  }

  private static showPopup(id: string) {
    document.getElementById(id)!.style.display = "flex";
    var inputField = document.getElementById(id)?.getElementsByTagName("input")[0]!;
    document.getElementById(inputField.id)!.focus();
    // (document.getElementById(inputField.id)! as HTMLFormElement).scrollIntoView({behavior: "smooth", block: "center"});

    // Set value of labelPopup-Input based on selected Link
    // slice creates a copy of last element --> so actually "labels" is not changed by "pop()"
    if (id=="linkPopup") {
      inputField.value = PetriView.selectedCell.attributes.labels.slice(-1).pop()["attrs"]["text"]["text"];
    }
  }

  private addPlace() {
    PetriView.graph.addCell(new joint.shapes.pn.Place(
      {attrs: 
        {'.label': {'text': '', 'fill': '#7c68fc'},
         '.root': {'stroke': '#7c68fc', 'stroke-width': 3},
         '.tokens > circle': {'fill': '#7a7e9b'},
         '.alot > text': {
           'fill': '#fe854c',
           'font-family': 'Courier New',
           'font-size': 20,
           'font-weight': 'bold',
           'ref-x': 0.5,
           'ref-y': 0.5,
           'y-alignment': -0.5,
           'transform': null as any
          }
        },
      tokens: 0,
      position: { x: 20, y: 25 }
    }));
    PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells())
  }

  private addTrans() {
    PetriView.selectedCell = new customTransition({
      position: { 
        x: 20,
        y: 30
      }
    });
    // PetriView.selectedCell = new joint.shapes.pn.Transition(
    //   {
    //     attrs: 
    //     {
    //       '.label': {'text': '', 'fill': '#fe854f'},
    //       '.root': {'fill': '#9586fd', 'stroke': '#7c68fc'},
    //       'rect': { width: 30, height: 40, fill: '#000000', stroke: '#000000', "stroke-width": 3 },
    //     },
    //     size: { width: 30, height: 40 },
    //     conditions: [],
    //     position: { x: 80, y: 25 }
    //   }
    // );
    
    PetriView.graph.addCell(PetriView.selectedCell);
    PetriView.showPopup("popup");
  }

  private removeCell() {
    try {
      PetriView.graph.removeCells(PetriView.selectedCell);
    } catch(e) {
      return "Nothing selected! Please select a place or transition before removing."
    }
  }

  private clearAll() {
    PetriView.paper.translate(0, 0);
    PetriView.paper.scale(1, 1, 0, 0);
    PetriView.graph.clear();
  }

  private simulate() {
    var transitions: any[] = []
    for (const c of PetriView.graph.getCells()) {
        if (c.attributes.type == "customTransition") {
            transitions.push(c);
        }
    }

    function fireTransition(t: any, sec: any) {

      var inbound = PetriView.graph.getConnectedLinks(t, { inbound: true });
      var outbound = PetriView.graph.getConnectedLinks(t, { outbound: true });
      var placesBefore = inbound.map(function(link) { return link.getSourceElement(); });
      var placesAfter = outbound.map(function(link) { return link.getTargetElement(); });
      var isFirable = true;

      // shuffle Places before to ensure it is random which places get checked first
      placesBefore = placesBefore.map((value) => ({ value, sort: Math.random() }))
                                 .sort((a, b) => a.sort - b.sort)
                                 .map(({ value }) => value);

      placesBefore.forEach(function(p: any) {
        if (p.get('tokens') === 0) {
          console.log("TOKENS");
          isFirable = false;
        } 
      });

      if (isFirable) {
        placesBefore.forEach(function(p: any) {
          // Let the execution finish before adjusting the value of tokens. So that we can loop over all transitions
          // and call fireTransition() on the original number of tokens. --> partially leads to negative tokens --> disabled for now
          // setTimeout(function() {
          //     p.set('tokens', p.get('tokens') - 1);
          // }, 0);
          p.set('tokens', p.get('tokens') - 1);

          var links = inbound.filter(function(l) { return l.getSourceElement() === p; });
          links.forEach(function(l) {
              var token = joint.V('circle', { r: 5, fill: '#feb662' }).node;
              (<joint.dia.LinkView> l.findView(PetriView.paper)).sendToken(token, sec * 1000);
          });
        });
        
        placesAfter.forEach(function(p: any) {
          var links = outbound.filter(function(l) { return l.getTargetElement() === p; });
          links.forEach(function(l) {
              var token = joint.V('circle', { r: 5, fill: '#feb662' }).node;
              (<joint.dia.LinkView> l.findView(PetriView.paper)).sendToken(token, sec * 1000, function() {
                  p.set('tokens', p.get('tokens') + 1);
              });
          });
        });
      }
    }

    // if (Math.random() < 0.7)
    transitions.forEach(function(this: any, t) {
      fireTransition(t, 1);
    })

    this.simulationId = setInterval(function() {
      transitions.forEach(function(this: any, t) {
        fireTransition(t, 1);
      });
    }, 2000);
  }

  private stopSimulation() {
    clearInterval(this.simulationId);
  }  

  private lockModel() {
    if (document.querySelector('#lock')!.textContent == " Lock") {
      document.querySelector('#lock')!.innerHTML = '<i class="fa fa-lock"></i>' + " Unlock"
      PetriView.paper.setInteractivity(function() { return false });

      jQuery('.joint-element').css("cursor", "pointer");
      jQuery('.marker-arrowheads').css("cursor", "pointer");
      jQuery('.marker-vertices').css("cursor", "pointer");
      jQuery('.joint-link.joint-theme-dark .connection-wrap').css("cursor", "pointer");
      //paper.setInteractivity({ elementMove: false }); // enables to still move the links
    } else {
      document.querySelector('#lock')!.innerHTML = '<i class="fa fa-unlock"></i>' + " Lock"
      PetriView.paper.setInteractivity(function() { return true });
      //paper.setInteractivity({ elementMove: true });
    }
  }

  private resetSim() {
    PetriView.paper.translate(0, 0);
    PetriView.paper.scale(1, 1, 0, 0);

    var i = 0
    PetriView.graph.getCells().forEach(function(this: any, c) {
        if (c.attributes.type == "pn.Place") {
            c.set('tokens', PetriView.backupTokens[i]);
            i+=1
        }
    });
  }

  private static saveGraph() {
    document.getElementById("savePopup")!.style.display = "none";
    const fileName = (<HTMLInputElement> document.getElementById("graphNameInput")!).value;
    const jsonstring = JSON.stringify(PetriView.graph.toJSON());
    localStorage.setItem(fileName, jsonstring);

    // Check for links existing with the same fileName and overwrite them
    if ($("a").filter(function() { return $(this).text() == fileName}).length == 0) {
      var newLink = document.createElement("a");
      newLink.textContent = fileName;
      newLink.addEventListener("click", (e:Event) => PetriView.unJSONify(fileName));
      document.getElementById("dropdown-content")!.appendChild(newLink);
    }

    // Reset the value of the graphNameInput-field and disable button again
    (<HTMLInputElement> document.getElementById("graphNameInput"))!.value = "";
    (<HTMLButtonElement> document.getElementById("saveGraphAs")!).disabled = true;
  }

  private static importJSON() {
    PetriView.paper.translate(0, 0);
    PetriView.paper.scale(1, 1, 0, 0);

    document.getElementById("uploadPopup")!.style.display = "none";
    var files = (<HTMLInputElement> document.getElementById("fileInput")).files!;
    if (files.length <= 0) {
      return false;
    }

    var reader = new FileReader();
    reader.onload = function(e: any) { 
      var jsonstring = JSON.parse(e.target.result);
      PetriView.graph.fromJSON(jsonstring);
      PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells());

      var fileName = files[0]["name"].split(".")[0]; 
      localStorage.setItem(fileName, e.target.result);
      
      // Check for links existing with the same fileName and overwrite them
      if ($("a").filter(function() { return $(this).text() == fileName}).length == 0) {
        var newLink = document.createElement("a");
        newLink.textContent = fileName;
        newLink.addEventListener("click", (e:Event) => PetriView.unJSONify(fileName));
        document.getElementById("dropdown-content")!.appendChild(newLink);
      }
    }
    
    reader.readAsText(files.item(0)!);
  }

  private downloadJSON() {
    console.log(PetriView.graph.toJSON());
    const jsonstring = JSON.stringify(PetriView.graph.toJSON());
    if (jsonstring == null) {
      console.log("There is no JSON file to be saved.");
    } else {
      let blob = new Blob([jsonstring], {type: 'data:text/json;charset=utf-8'});
      let url = URL.createObjectURL(blob);

      let a = document.createElement("a");
      a.setAttribute('download', 'graph.json');
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.click();
    }
  }

  private static unJSONify(fileName: string) {
    const jsonstring = localStorage.getItem(fileName)!;
    PetriView.graph.fromJSON(JSON.parse(jsonstring));
  }

  private saveIMG() {
    let svg = (<Node> document.querySelector('svg'));
    if (svg == null) {
      console.log("There is no SVG to be saved.");
    } else {
      let data = (new XMLSerializer()).serializeToString(svg);
      let blob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'}); // to save as svg svg+xml (remember to change filename to .svg)
      let url = URL.createObjectURL(blob);

      let a = document.createElement('a');

      a.setAttribute('download', 'image.svg');
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.click();
    }
  }

  private enableLabelButton(input: any) {
    if (PetriView.selectedCell.attributes.type == "customTransition" && PetriView.selectedCell.attributes.attrs["label"]["text"] == "") {
      $("#changelabel").prop("disabled", !((<HTMLInputElement> document.getElementById("input"))!.value));
    } 
  }

  private enableSaveButton(input: any) {
    $("#saveGraphAs").prop("disabled", !((<HTMLInputElement> document.getElementById("graphNameInput"))!.value));
  }

  private static saveChanges() {
    document.getElementById("popup")!.style.display = "none";
    var newLabel = (<HTMLInputElement> document.getElementById("input"))!.value;

    if (newLabel != "") {
      (PetriView.selectedCell.attributes.type == "pn.Place") ? PetriView.selectedCell.attr('.label/text', newLabel) 
      : PetriView.selectedCell.attr('label/text', newLabel);
      (<HTMLInputElement> document.getElementById("input"))!.value = "";
      $("#changelabel").prop("disabled", true);
    }
  }

  private static saveConditions() {
    document.getElementById("condPopup")!.style.display = "none";
    var input = (<HTMLInputElement> document.getElementById("conditionInput"))!
    var conds = input.value.split(",");
    conds.forEach(function(c) {
      PetriView.selectedCell.addDefaultPort(c.trim());
    });

    input.value = "";
    PetriView.selectedCell = null;
  }

  private static changeProb() {
    document.getElementById("linkPopup")!.style.display = "none";
    var inputEl = (<HTMLInputElement> document.getElementById("linkInput")!);

    PetriView.selectedCell.attributes.labels.pop();
    PetriView.selectedCell.appendLabel({
      attrs: {text: { text: inputEl.value }},
      position: {distance: 0.5, args: { keepGradient: true, ensureLegibility: true }}
    });
  }
}