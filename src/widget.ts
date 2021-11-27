// Copyright (c) Jakob Bucksch
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';
import * as joint from '../node_modules/jointjs/dist/joint';
import '../css/widget.css';

// HERE IS THE IMPORT WHICH DOES NOT WORK
// import * as fs from "fs";
// var promises = require("fs").promises;

window.joint = joint    // important for loading a saved graph (namespace problem)

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
  simulationId: any;
  width: any;
  height: any;

  render() {
    // DROPDOWN GRAPH-BUTTON
    var dropdown = document.createElement("div");
    dropdown.className = "dropdown";
    
    var graphsButton = document.createElement("button");
    graphsButton.className = "button button1";
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
    addPlace.className = "button button2";
    addPlace.addEventListener("click", (e:Event) => this.addPlace());
    addPlace.innerHTML = '<i class="fa fa-plus"></i>' + " Place";
    
    var addTrans = document.createElement("button");
    addTrans.className = "button button2";
    addTrans.addEventListener("click", (e:Event) => this.addTrans());
    addTrans.innerHTML = '<i class="fa fa-plus"></i>' + " Transition";

    var removeCell = document.createElement("button");
    removeCell.className = "button button2";
    removeCell.addEventListener("click", (e:Event) => this.removeCell());
    removeCell.innerHTML = '<i class="fa fa-trash"></i>' + " Remove";

    var clearAll = document.createElement("button");
    clearAll.className = "button button2";
    clearAll.addEventListener("click", (e:Event) => this.clearAll());
    clearAll.innerHTML = '<i class="fa fa-eraser"></i>' + " Clear";

    var simulate = document.createElement("button");
    simulate.className = "button button3";
    simulate.addEventListener("click", (e:Event) => this.simulate());
    simulate.innerHTML = '<i class="fa fa-caret-right icon-large"></i>' + " Play";

    var stopSimulation = document.createElement("button");
    stopSimulation.className = "button button3";
    stopSimulation.addEventListener("click", (e:Event) => this.stopSimulation());
    stopSimulation.innerHTML = '<i class="fa fa-stop"></i>' + " Stop";

    var lockModel = document.createElement("button");
    lockModel.className = "button button4";
    lockModel.id = "lock"
    lockModel.addEventListener("click", (e:Event) => this.lockModel());
    lockModel.innerHTML = '<i class="fa fa-unlock"></i>' + " Lock";

    var reloadSim = document.createElement("button");
    reloadSim.className = "button button4";
    reloadSim.addEventListener("click", (e:Event) => this.reloadSim());
    reloadSim.innerHTML = '<i class="fa fa-refresh"></i>' + " Reload";

    var saveGraph = document.createElement("button");
    saveGraph.className = "button button4";
    saveGraph.addEventListener("click", (e:Event) => PetriView.showSavePopup());
    saveGraph.innerHTML = '<i class="fa fa-save"></i>' + " Save Graph";

    var saveIMG = document.createElement("button");
    saveIMG.className = "button button4";
    saveIMG.addEventListener("click", (e:Event) => this.saveIMG());
    saveIMG.innerHTML = '<i class="fa fa-download"></i>' + "Download SVG";

    // LABEL-POPUP
    var popup = document.createElement("div");
    popup.id = "popup";
    popup.className = "popup";
    popup.style.display = "none";

    var popupContent = document.createElement("div");
    popupContent.className = "popup-content";

    var input = document.createElement("input");
    input.placeholder = "Enter label...";
    input.id = "input";
    input.oninput = this.enableLabelButton;

    var changeLabel = document.createElement("button");
    changeLabel.id = "changelabel";
    changeLabel.className = "button button1";
    changeLabel.addEventListener("click", (e:Event) => PetriView.changeLabel());
    changeLabel.disabled = true;
    changeLabel.textContent = "Change label";

    popupContent.appendChild(input);
    popupContent.appendChild(changeLabel);
    popup.appendChild(popupContent);

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
    saveInput.oninput = this.enableSaveButton;

    var saveGraphAs = document.createElement("button");
    saveGraphAs.id = "saveGraphAs";
    saveGraphAs.className = "button button1";
    saveGraphAs.addEventListener("click", (e:Event) => this.saveGraph());
    saveGraphAs.disabled = true;
    saveGraphAs.textContent = "Save Graph!";

    savePopupContent.appendChild(saveInput);
    savePopupContent.appendChild(saveGraphAs);
    savePopup.appendChild(savePopupContent);

    // ADD EVERYTHING TO NOTEBOOK HTML CODE
    this.el.appendChild(dropdown);
    this.el.appendChild(addToken);
    this.el.appendChild(removeToken);
    this.el.appendChild(addPlace);
    this.el.appendChild(addTrans);
    this.el.appendChild(removeCell);
    this.el.appendChild(clearAll);
    this.el.appendChild(simulate);
    this.el.appendChild(stopSimulation);
    this.el.appendChild(lockModel);
    this.el.appendChild(reloadSim);
    this.el.appendChild(saveGraph);
    this.el.appendChild(saveIMG);

    this.initWidget();
    PetriView.paper.el.id = "paper";
    this.el.appendChild(PetriView.paper.el);
    this.el.lastChild?.appendChild(popup);     // make sure popup is a child of paper
    this.el.lastChild?.appendChild(savePopup); // make sure savePopup is a child of paper as well

    // if clicked outside of ChangeLabel-Form, do not display it anymore
    window.onclick = function(event: MouseEvent) {
      if ((event.target! as Element).className === "popup" && PetriView.selectedCell.attributes.type != "pn.Transition") {
        (event.target! as HTMLDivElement).style.display = "none";
      }
    }

    // Click changeLabel-button on keyboardinput "enter"
    document.addEventListener("keydown", function(e) {
        if (e.key == "Enter" &&  !((document.getElementById("changelabel")! as HTMLButtonElement).disabled)) {
            PetriView.changeLabel()
        }
    })

    // Paper on-click, -doubleclick, -alt-drag and on-hover functionalities
    PetriView.paper.on({
      // while alt-key is pressed cell is locked and you can connect it by dragging with mouseclick
      // otherwise the cell stroke is simply colored red
      'cell:pointerdown': function (this: joint.dia.Paper, cellView: any, evt: any) {    
          if (evt.altKey) {
              jQuery('.joint-element').css("cursor", "crosshair")
              evt.data = cellView.model.position();
              this.findViewByModel(cellView.model).setInteractivity(false);
              // this.findViewByModel(cellView.model).options.interactive = false;
              PetriView.selectedCell = cellView.model
          } else {
              jQuery('.joint-element').css("cursor", "move")
              
              if (cellView.model.attributes.type != "pn.Link") {
                  if (cellView.model.attributes.attrs[".root"]["stroke"] == "red") {
                    cellView.model.attr({".root": { "stroke": "#7c68fc" }});
                  } else {
                    PetriView.graph.getElements().forEach(function(element: joint.dia.Cell) {
                      element.attr({".root": { "stroke": "#7c68fc" }});
                    });
                    cellView.model.attr({".root": { "stroke": "red" }});
                    PetriView.selectedCell = cellView.model
                  }
              }
          }
      },

      // when mousebutton is lifted up while altkey is pressed a link is created between source and destination
      // if altkey is not pressed simply unlock the cell again (only if Lock-Button was not pressed)
      'cell:pointerup': function(this: joint.dia.Paper, cellView: any, evt: any, x: any, y: any) {
          if (evt.altKey) {
              jQuery('.joint-element').css("cursor", "move")
              if (document.querySelector('#lock')!.textContent == " Lock") {
                this.findViewByModel(cellView.model).setInteractivity(true);
                // this.findViewByModel(cellView.model).options.interactive = true;
              }
              var coordinates = new joint.g.Point(x, y);
              var elementAbove = cellView.model;
              var elementBelow = this.model.findModelsFromPoint(coordinates).find(function(cell: joint.dia.Cell) {
                  return (cell.id !== elementAbove.id)
              });
              
              // If the two elements are connected already or have the same cell type, don't connect them (again).
              if ((elementBelow && PetriView.graph.getNeighbors(elementBelow).indexOf(elementAbove) === -1) && 
                  (elementAbove.attributes.type != elementBelow.attributes.type)) {
                  
                  // Move the cell to the position before dragging and create a connection afterwards.
                  elementAbove.position(evt.data.x, evt.data.y);
                  PetriView.graph.addCell(PetriView.link(elementAbove, elementBelow));
              }
          }
          else {
              jQuery('.joint-element').css("cursor", "move")
              if (document.querySelector('#lock')!.textContent == " Lock") {
                this.findViewByModel(cellView.model).setInteractivity(true);
                // this.findViewByModel(cellView.model).options.interactive = true;
              }
          }
      },

      // Add small remove-options on hover above places and transitions
      'cell:mouseenter': (elementView: joint.dia.ElementView) => {
          if (elementView.model.attributes.type != "pn.Link") {
              elementView.addTools(
                  new joint.dia.ToolsView({
                      tools: [
                          new joint.elementTools.Remove({
                          useModelGeometry: true,
                          y: '30%',
                          x: '95%',
                          }),
                      ],
                  })
              );
          }
      },
      
      // remove small remove-options as soon as mouse leaves the cell
      'element:mouseleave': (elementView: joint.dia.ElementView) => {
          elementView.removeTools();
      },

      // Prevent overflow of cells in paper-div
      // TODO: prevent overflow to left and up
      'cell:pointermove': function (cellView: any, evt: any, x: any, y: any) {
          var bbox = cellView.getBBox();
          var constrained = false;

          var constrainedX = x;
          if (bbox.x <= 0) { constrainedX = x + this.gridSize; constrained = true }
          if (bbox.x + bbox.width >= $("#paper").width()!) { constrainedX = x - PetriView.gridSize; constrained = true }
      
          var constrainedY = y;
          if (bbox.y <= 0) { constrainedY = y + this.gridSize; constrained = true }
          if (bbox.y + bbox.height >= $("#paper").height()!) { constrainedY = y - PetriView.gridSize; constrained = true }
      
          //if you fire the event all the time you get a stack overflow
          if (constrained) { cellView.pointermove(evt, constrainedX, constrainedY) }
      },

      // Allow changing the label upon doubleclicking a place or transition
      'cell:pointerdblclick': function () {
        // Jupyter.keyboard_manager.disable() would help to not run shortcuts if input is not focused
        PetriView.showPopup();
      }
    });

    // EXAMPLE HOW TO UPDATE TYPESCRIPT FROM PYTHON:
    // this.model.on("change:graph", this.updateGraph, this);
    // this.model.on_some_change(["graph"], this.updateGraph, this);

    // UPDATING PYTHON BASED ON TYPESCRIPT
    PetriView.graph.on("change", this.updateGraph.bind(this), this);
  }

  private updateGraph() {
    this.model.set("graph", PetriView.graph.getCells());
    this.model.save_changes();
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
      cellViewNamespace: namespace,                   // crucial for the tokens to get rendered when jointjs is loaded as a module !!!
      linkPinning: false,                             // prevent dangling links
      interactive: function() { return true },        // make cells draggable
    });
  }

  private getTokenlist(cells: any) {
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
                'fill': '#7c68fc' },
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
        .position(350, 160)
        .set('tokens', 12)
        .attr({
            '.label': {
                'text': 'buffer'
            },
        });

    var cAccepted = pReady.clone()
        .attr('.label/text', 'accepted')
        .position(550, 50)
        .set('tokens', 1);

    var cReady = pReady.clone()
        .attr('.label/text', 'accepted')
        .position(560, 260)
        .set('ready', 3);

    // Define Transitions
    var tProduce = new joint.shapes.pn.Transition({
        size: { width: 30, height: 40 },
        position: { x: 50, y: 160 },
        attrs: {
            '.label': {
                'text': 'produce',
                'fill': '#fe854f'
            },
            '.root': {
                'fill': '#9586fd',
                'stroke': '#7c68fc'
            },
            'rect': {
	            width: 12,
	            height: 50,
	            fill: '#000000',
	            stroke: '#000000',
                "stroke-width": 3,
	        },
        }
    });

    var tSend = tProduce.clone()
        .attr('.label/text', 'send')
        .position(270, 160);

    var tAccept = tProduce.clone()
        .attr('.label/text', 'accept')
        .position(470, 160);

    var tConsume = tProduce.clone()
        .attr('.label/text', 'consume')
        .position(680, 160);

    // add cells to graph and create links
    PetriView.graph.addCell([pReady, pIdle, buffer, cAccepted, cReady, tProduce, tSend, tAccept, tConsume]);
    PetriView.graph.addCell([
      PetriView.link(tProduce, pReady), PetriView.link(pReady, tSend), PetriView.link(tSend, pIdle), PetriView.link(pIdle, tProduce), 
      PetriView.link(tSend, buffer), PetriView.link(buffer, tAccept), PetriView.link(tAccept, cAccepted), 
      PetriView.link(cAccepted, tConsume), PetriView.link(tConsume, cReady), PetriView.link(cReady, tAccept)
    ]);

    PetriView.backupTokens = this.getTokenlist(PetriView.graph.getCells())
  }

  private secondExample() {
    this.clearAll();

    var pA1 = new joint.shapes.pn.Place({
        position: { x: 50, y: 150 },
        attrs: {
            '.label': {
                'text': 'A1',
                'fill': '#7c68fc' },
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
        tokens: 1
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
    var tA1 = new joint.shapes.pn.Transition({
        size: { width: 30, height: 40 },
        position: { x: 210, y: 50 },
        attrs: {
            '.label': {
                'fill': '#fe854f',
                'text': "Transition A1"
            },
            '.root': {
                'fill': '#9586fd',
                'stroke': '#7c68fc'
            },
            'rect': {
	            width: 12,
	            height: 50,
	            fill: '#000000',
	            stroke: '#000000',
                "stroke-width": 3,
	        },
        }
    });

    var tA2 = tA1.clone()
        .position(210, 250)
        .attr('.label/text', 'Transition A2');

    var tB1 = tA1.clone()
        .position(510, 250)
        .attr('.label/text', 'Transition B1');

    var tB2 = tA1.clone()
        .position(510, 50)
        .attr('.label/text', 'Transition B2');

    // add cells to graph and create links
    PetriView.graph.addCell([pA1, pA2, pConnector, pB1, pB2, tA1, tA2, tB1, tB2]);
    PetriView.graph.addCell([
      PetriView.link(pA1, tA1), PetriView.link(tA1, pA2), PetriView.link(pA2, tA2), PetriView.link(tA2, pA1), PetriView.link(tA2, pConnector),
      PetriView.link(pConnector, tA1), PetriView.link(pConnector, tB1), PetriView.link(tB1, pB2), PetriView.link(pB2, tB2), PetriView.link(tB2, pConnector),
      PetriView.link(tB2, pB1), PetriView.link(pB1, tB1)
    ]);

    PetriView.backupTokens = this.getTokenlist(PetriView.graph.getCells())
  }

  private static link(a: any, b: any) {
    return new joint.shapes.pn.Link({
        source: { id: a.id, selector: '.root' },
        target: { id: b.id, selector: '.root' },
        attrs: {
            '.connection': {
                'fill': 'none',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                'stroke': '#4b4a67'
            },
        }
    });
  }

  private addToken() {
    try {
      if (PetriView.selectedCell.attributes.type != "pn.Place") {
        console.log("You cannot add tokens to transitions! Please select a place instead.");
      } else {
        PetriView.selectedCell.set('tokens', PetriView.selectedCell.get('tokens') + 1);
        PetriView.backupTokens = this.getTokenlist(PetriView.graph.getCells())
      }
    } catch(e) {
      return "Nothing selected! Please select a place before adding a token."
      // console.log("Nothing selected! Please select a place before adding a token.")
    }
  }

  private removeToken() {
    try {
      if (PetriView.selectedCell.attributes.type != "pn.Place") {
          return "You cannot remove tokens from transitions! Please select a place instead."
          // console.log("You cannot remove tokens from transitions! Please select a place instead.");
      } else {
          if (PetriView.selectedCell.get('tokens') > 0) {
            PetriView.selectedCell.set('tokens', PetriView.selectedCell.get('tokens') - 1);
            PetriView.backupTokens = this.getTokenlist(PetriView.graph.getCells())
          }
      }
    } catch(e) {
        return "Nothing selected! Please select a place before removing a token."
        // console.log("Nothing selected! Please select a place before removing a token.")
    }
  }

  private static showPopup() {
    document.getElementById("popup")!.style.display = "flex";
    (document.getElementById("input")! as HTMLFormElement).autofocus = true;
    // document.getElementById("input")!.focus();
  }

  private static showSavePopup() {
    document.getElementById("savePopup")!.style.display = "flex";
    (document.getElementById("graphNameInput")! as HTMLFormElement).autofocus = true;
    // document.getElementById("input")!.focus();
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
      position: { x: 20, y: 20 }
    }));
    PetriView.backupTokens = this.getTokenlist(PetriView.graph.getCells())
  }

  private addTrans() {
    PetriView.selectedCell = new joint.shapes.pn.Transition(
      {attrs: 
        {'.label': {'text': '', 'fill': '#fe854f'},
         '.root': {'fill': '#9586fd', 'stroke': '#7c68fc'},
         'rect': { width: 30, height: 40, fill: '#000000', stroke: '#000000', "stroke-width": 3}},
      size: { width: 30, height: 40 },
      position: { x: 80, y: 20 }
    });
    
    PetriView.graph.addCell(PetriView.selectedCell);
    PetriView.showPopup();
  }

  private removeCell() {
    try {
      PetriView.graph.removeCells(PetriView.selectedCell);
    } catch(e) {
      return "Nothing selected! Please select a place or transition before removing."
      // console.log("Nothing selected! Please select a place or transition before removing.")
    }
  }

  private clearAll() {
    PetriView.graph.clear();
  }

  private simulate() {
    var transitions: any[] = []
    for (const c of PetriView.graph.getCells()) {
        if (c.attributes.type == "pn.Transition") {
            transitions.push(c);
        }
    }

    function fireTransition(t: any, sec: any) {
      var inbound = PetriView.graph.getConnectedLinks(t, { inbound: true });
      var outbound = PetriView.graph.getConnectedLinks(t, { outbound: true });
  
      var placesBefore = inbound.map(function(link) {
          return link.getSourceElement();
      });
      var placesAfter = outbound.map(function(link) {
          return link.getTargetElement();
      });
  
      var isFirable = true;
      console.log(placesBefore)
      // shuffle Places before to ensure it is random which places get checked first
      placesBefore = placesBefore.map((value) => ({ value, sort: Math.random() }))
                                 .sort((a, b) => a.sort - b.sort)
                                 .map(({ value }) => value);
      console.log(placesBefore)

      placesBefore.forEach(function(p: any) {
          if (p.get('tokens') === 0) {
              isFirable = false;
          }
      });
      console.log(isFirable)
  
      if (isFirable) {
  
          placesBefore.forEach(function(p: any) {
              // Let the execution finish before adjusting the value of tokens. So that we can loop over all transitions
              // and call fireTransition() on the original number of tokens. --> partially leads to negative tokens --> disabled for now
              // setTimeout(function() {
              //     p.set('tokens', p.get('tokens') - 1);
              // }, 0);
  
              p.set('tokens', p.get('tokens') - 1);
              
              var links = inbound.filter(function(l) {
                  return l.getSourceElement() === p;
              });
  
              links.forEach(function(l) {
                  var token = joint.V('circle', { r: 5, fill: '#feb662' }).node;
                  (<joint.dia.LinkView> l.findView(PetriView.paper)).sendToken(token, sec * 1000);
              });
          });
  
          placesAfter.forEach(function(p: any) {
  
              var links = outbound.filter(function(l) {
                  return l.getTargetElement() === p;
              });
  
              links.forEach(function(l) {
                  var token = joint.V('circle', { r: 5, fill: '#feb662' }).node;
                  (<joint.dia.LinkView> l.findView(PetriView.paper)).sendToken(token, sec * 1000, function() {
                      p.set('tokens', p.get('tokens') + 1);
                  });
              });
          });
      }
    }

    transitions.forEach(function(this: any, t) {
        if (Math.random() < 0.7) {
          fireTransition(t, 1);
        }
    });

    this.simulationId = setInterval(function() {
        transitions.forEach(function(this: any, t) {
            if (Math.random() < 0.7) {
              fireTransition(t, 1);
            }
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

  private reloadSim() {
    var i = 0
    PetriView.graph.getCells().forEach(function(this: any, c) {
        if (c.attributes.type == "pn.Place") {
            c.set('tokens', PetriView.backupTokens[i]);
            i+=1
        }
    });
  }

  private saveGraph() {
    document.getElementById("savePopup")!.style.display = "none";
    const fileName = (<HTMLInputElement> document.getElementById("graphNameInput")!).value;
    const jsonstring = JSON.stringify(PetriView.graph.toJSON());
    localStorage.setItem(fileName, jsonstring);

    // TODO: Check for links existing with the same fileName and overwrite them or delete and create new
    var newLink = document.createElement("a");
    newLink.textContent = fileName;
    newLink.addEventListener("click", (e:Event) => this.unJSONify(fileName));
    document.getElementById("dropdown-content")!.appendChild(newLink);
    console.log(document.getElementById("dropdown-content")!.childNodes);

    // Reset the value of the graphNameInput-field
    (<HTMLInputElement> document.getElementById("input"))!.value = "";
  }

  private unJSONify(fileName: string) {
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
    if (input.value != "" || PetriView.selectedCell.attributes.type == "pn.Place") {
      (<HTMLButtonElement> document.getElementById("changelabel")!).disabled = false;
    } else {
      (<HTMLButtonElement> document.getElementById("changelabel")!).disabled = true;
    }
  }

  private enableSaveButton(input: any) {
    if (input.value != "") {
      (<HTMLButtonElement> document.getElementById("saveGraphAs")!).disabled = false;
    } else {
      (<HTMLButtonElement> document.getElementById("saveGraphAs")!).disabled = true;
    }
  }

  private static changeLabel() {
    document.getElementById("popup")!.style.display = "none";
    var newLabel = (<HTMLInputElement> document.getElementById("input"))!.value;

    if (newLabel != "") {
      PetriView.selectedCell.attr('.label/text', newLabel);
      (<HTMLInputElement> document.getElementById("input"))!.value = "";
    }
  }

}
