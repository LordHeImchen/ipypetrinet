// Copyright (c) Jakob Bucksch
// Distributed under the terms of the Modified BSD License.

import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { customTransition } from './customTrans';

import * as joint from '../node_modules/jointjs/dist/joint';
import '../css/widget.css';
import graphlib from 'graphlib';
import dagre from 'dagre';

// very important for loading a saved graph (namespace problem)
window.joint = joint;
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
      caseAttrs: [],
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
  static caseAttrs: Array<string> = [];
  static eventAttrs: Array<string> = [];
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

    var setLayout = document.createElement("button");
    setLayout.className = "button button1";
    setLayout.addEventListener("click", (e:Event) => PetriView.showPopup("layoutPopup"));
    setLayout.innerHTML = '<i class="fa fa-sitemap"></i>' + " Layout";

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
    importJSON.innerHTML = '<i class="fa fa-upload"></i>' + " Import Graph";

    var downloadJSON = document.createElement("button");
    downloadJSON.className = "button button2";
    downloadJSON.addEventListener("click", (e:Event) => PetriView.showPopup("DownloadPopup"));
    downloadJSON.innerHTML = '<i class="fa fa-download"></i>' + " Download Graph";

    var zoomIn = document.createElement("button");
    zoomIn.className = "button button2";
    zoomIn.addEventListener("click", (e:Event) => PetriView.zoomIt(1));
    zoomIn.innerHTML = '<i class="fa fa-search-plus"></i>' + " Zoom in";

    var zoomOut = document.createElement("button");
    zoomOut.className = "button button2";
    zoomOut.addEventListener("click", (e:Event) => PetriView.zoomIt(-1));
    zoomOut.innerHTML = '<i class="fa fa-search-minus"></i>' + " Zoom out";

    var addAttrs = document.createElement("button");
    addAttrs.className = "button button1";
    addAttrs.addEventListener("click", (e:Event) => PetriView.showPopup("attrPopup"));
    addAttrs.innerHTML = '<i class="fa fa-plus"></i>' + " Attributes";

    // DOWNLOAD-POPUP
    var downPopup = document.createElement("div");
    downPopup.id = "DownloadPopup";
    downPopup.className = "popup";
    downPopup.style.display = "none";

    var downPopupContent = document.createElement("div");
    downPopupContent.id = "DownloadPopupContent";
    downPopupContent.className = "popup-content";
    downPopupContent.style.display = "flex";

    var JSONButton = document.createElement("button");
    JSONButton.id = "JSONButton";
    JSONButton.className = "button button1";
    JSONButton.innerHTML = "JSON";
    JSONButton.addEventListener("click", (e:Event) => this.downloadJSON());

    var PNMLButton = document.createElement("button");
    PNMLButton.id = "PNMLButton";
    PNMLButton.className = "button button1";
    PNMLButton.innerHTML = "PNML";
    PNMLButton.addEventListener("click", (e:Event) => this.downloadPNML());

    downPopupContent.append(JSONButton, PNMLButton);
    downPopup.appendChild(downPopupContent);

    // ATTRIBUTES-POPUP
    var attrPopup = document.createElement("div");
    attrPopup.id = "attrPopup";
    attrPopup.className = "popup";
    attrPopup.style.display = "none";

    var attrPopupContent = document.createElement("div");
    attrPopupContent.className = "popup-content attributes";
    attrPopupContent.id = "attrPopupContent";

    var caseTab = document.createElement("button");
    caseTab.id = "caseTab";
    caseTab.className = "tablinks active";
    caseTab.textContent = "Add Case-Attributes";
    caseTab.addEventListener("click", (e:Event) => PetriView.showTab(caseTab.id));

    var eventTab = document.createElement("button");
    eventTab.id = "eventTab";
    eventTab.className = "tablinks";
    eventTab.textContent = "Add Event-Attributes";
    eventTab.addEventListener("click", (e:Event) => PetriView.showTab(eventTab.id));

    var tabBar = document.createElement("div");
    tabBar.id = "tabBar";
    tabBar.className = "tab";
    tabBar.style.display = "flex";
    tabBar.append(caseTab, eventTab);

    var caseAttrsList = document.createElement('ul');
    caseAttrsList.id = "caseAttrsList";

    var observer = new MutationObserver(() => this.updateCaseAttrs());
    observer.observe(caseAttrsList, {childList: true});

    var attrName = document.createElement("input");
    attrName.id = "attrName";
    attrName.type = "text";
    attrName.placeholder = "Name your attribute...";
    attrName.oninput = this.enableAttributeButtons;

    var check0 = document.createElement("input");
    check0.type = "radio";
    check0.id = "staticAttr";
    check0.name = "dist";
    check0.addEventListener("change", (e:Event) => this.toggleFields(check0.id));
    var label0 = document.createElement("label");
    label0.htmlFor = "staticAttr";
    label0.textContent = "List with probabilities";
    var div0 = document.createElement("div");
    div0.style.display = "flex";
    div0.append(check0, label0);
    
    var staticValue = document.createElement("input");
    staticValue.id = "staticVal";
    staticValue.placeholder = '"item0", "item1", "item2", ...';
    staticValue.style.display = "none";

    var staticProbs = document.createElement("input");
    staticProbs.id = "staticProbs";
    staticProbs.placeholder = "Probabilities summing to one...";
    staticProbs.style.display = "none";

    var check1 = document.createElement("input");
    check1.type = "radio";
    check1.id = "normalDist";
    check1.name = "dist";
    check1.addEventListener("change", (e:Event) => this.toggleFields(check1.id));
    var label1 = document.createElement("label");
    label1.htmlFor = "normalDist";
    label1.textContent = "Normal Distribution";
    var div1 = document.createElement("div");
    div1.style.display = "flex";
    div1.append(check1, label1);

    var mue = document.createElement("input");
    mue.id = "mue";
    mue.type = "number";
    mue.placeholder = "Select mean...";
    mue.style.display = "none";

    var sigma = document.createElement("input");
    sigma.id = "sigma";
    sigma.type = "number";
    sigma.placeholder = "Select sigma...";
    sigma.style.display = "none";

    var check2 = document.createElement("input");
    check2.type = "radio";
    check2.id = "bernDist";
    check2.name = "dist";
    check2.addEventListener("change", (e:Event) => this.toggleFields(check2.id));
    var label2 = document.createElement("label");
    label2.htmlFor = "bernDist";
    label2.textContent = "Bernoulli Distribution";
    label2.append(check2)
    var div2 = document.createElement("div");
    div2.style.display = "flex";
    div2.append(check2, label2);

    var n = document.createElement("input");
    n.id = "n";
    n.placeholder = "Choose n..."
    n.type = "number";
    n.min = "0";
    n.step = "1";
    n.style.display = "none";

    var p = document.createElement("input");
    p.id = "p";
    p.placeholder = "Choose p..."
    p.type = "number";
    p.min = "0";
    p.max = "1";
    p.step = "0.01";
    p.style.display = "none";

    var check3 = document.createElement("input");
    check3.type = "radio";
    check3.id = "gammaDist";
    check3.name = "dist";
    check3.addEventListener("change", (e:Event) => this.toggleFields(check3.id));
    var label3 = document.createElement("label");
    label3.htmlFor = "gammaDist";
    label3.textContent = "Gamma Distribution";
    var div3 = document.createElement("div");
    div3.style.display = "flex";
    div3.append(check3, label3);

    var k = document.createElement("input");
    k.id = "k";
    k.placeholder = "Choose k..."
    k.type = "number";
    k.min = "0";
    k.style.display = "none";

    var theta = document.createElement("input");
    theta.id = "theta";
    theta.placeholder = "Choose theta..."
    theta.type = "number";
    theta.min = "0";
    theta.style.display = "none";

    var check4 = document.createElement("input");
    check4.type = "radio";
    check4.id = "expoDist";
    check4.name = "dist";
    check4.addEventListener("change", (e:Event) => this.toggleFields(check4.id));
    var label4 = document.createElement("label");
    label4.htmlFor = "expoDist";
    label4.textContent = "Exponential Distribution";
    var div4 = document.createElement("div");
    div4.style.display = "flex";
    div4.append(check4, label4);

    var beta = document.createElement("input");
    beta.id = "beta";
    beta.placeholder = "Choose beta...";
    beta.type = "number";
    beta.min = "0";
    beta.style.display = "none";

    var addCaseAttributes = document.createElement("button");
    addCaseAttributes.className = "button button1";
    addCaseAttributes.id = "addCaseAttributes";
    addCaseAttributes.textContent = "Add Case-Attribute!";
    addCaseAttributes.disabled = true;
    addCaseAttributes.addEventListener("click", (e:Event) => this.addAttributes());

    var caseTabContent = document.createElement("div");
    caseTabContent.id = "caseTabContent";
    caseTabContent.style.display = "block";

    var eventTabContent = document.createElement("div");
    eventTabContent.id = "eventTabContent";
    eventTabContent.style.display = "none";

    var eventHeader = document.createElement("p");
    eventHeader.id = "eventHeader";
    eventHeader.style.marginLeft = "1px";
    eventHeader.textContent = "Select the transition to be linked:";

    var transList = document.createElement("ul");
    transList.id = "transList";
    transList.style.columns = "2";

    var addEventAttributes = document.createElement("button");
    addEventAttributes.className = "button button1";
    addEventAttributes.id = "addEventAttributes";
    addEventAttributes.textContent = "Add Event-Attribute!";
    addEventAttributes.disabled = true;
    addEventAttributes.addEventListener("click", (e:Event) => this.addAttributes());

    var eventAttrsList = document.createElement('ul');
    eventAttrsList.id = "eventAttrsList";

    caseTabContent.append(addCaseAttributes, caseAttrsList);
    eventTabContent.append(eventHeader, transList, addEventAttributes, eventAttrsList);
    attrPopupContent.append(tabBar, attrName, div0, staticValue, staticProbs, div1, mue, sigma, div2, n, p, 
                            div3, k, theta, div4, beta, caseTabContent, eventTabContent)
    attrPopup.append(attrPopupContent);

    // LAYOUT-POPUP
    var layoutPopup = document.createElement("div");
    layoutPopup.id = "layoutPopup";
    layoutPopup.className = "popup";
    layoutPopup.style.display = "none";

    var layoutContent = document.createElement("div");
    layoutContent.className = "popup-content";

    var nodeSep = document.createElement("input");
    nodeSep.min = "1";
    nodeSep.max = "200";
    nodeSep.value = "50";    
    nodeSep.type = "range";
    nodeSep.id = "nodeSepInput";
    nodeSep.className = "slider";
    nodeSep.oninput = (e:Event) => {nodeSpan.innerHTML = nodeSep.value};
    var nodeP = document.createElement("p");
    nodeP.innerHTML = "Node Separation: "
    var nodeSpan = document.createElement("span");
    nodeSpan.innerHTML = nodeSep.value;
    nodeP.appendChild(nodeSpan);

    var edgeSep = document.createElement("input");
    edgeSep.min = "1";
    edgeSep.max = "200";
    edgeSep.value = "50";    
    edgeSep.type = "range";
    edgeSep.id = "edgeSepInput";
    edgeSep.className = "slider";
    edgeSep.oninput = (e:Event) => {edgeSpan.innerHTML = edgeSep.value};
    var edgeP = document.createElement("p");
    edgeP.innerHTML = "Edge Separation: "
    var edgeSpan = document.createElement("span");
    edgeSpan.innerHTML = edgeSep.value;
    edgeP.appendChild(edgeSpan);

    var rankSep = document.createElement("input");
    rankSep.min = "1";
    rankSep.max = "200";
    rankSep.value = "50";    
    rankSep.type = "range";
    rankSep.id = "rankSepInput";
    rankSep.className = "slider";
    rankSep.oninput = (e:Event) => {rankSpan.innerHTML = rankSep.value};
    var rankP = document.createElement("p");
    rankP.innerHTML = "Rank Separation: "
    var rankSpan = document.createElement("span");
    rankSpan.innerHTML = rankSep.value;
    rankP.appendChild(rankSpan);

    var orientationP = document.createElement("p");
    orientationP.innerHTML = "Orientation: ";
    var selectDiv = document.createElement("div");
    selectDiv.className = "select";
    var layoutDir = document.createElement("select");
    layoutDir.id = "layoutDir";
    layoutDir.value = "LR";
    var dirOption1 = document.createElement("option");
    dirOption1.label = "Left-Right";
    dirOption1.value = "LR";
    dirOption1.selected = true;
    var dirOption2 = document.createElement("option");
    dirOption2.label = "Bottom-Top";
    dirOption2.value = "BT";
    var dirOption3 = document.createElement("option");
    dirOption3.label = "Top-Bottom";
    dirOption3.value = "TB";
    var dirOption4 = document.createElement("option");
    dirOption4.label = "Right-Left";
    dirOption4.value = "RL";
    layoutDir.append(dirOption1, dirOption2, dirOption3, dirOption4);
    selectDiv.appendChild(layoutDir);

    var confirmButton = document.createElement("button");
    confirmButton.className = "button button1";
    confirmButton.style.marginTop = "5px";
    confirmButton.innerHTML = "Set Layout!";
    confirmButton.addEventListener("click", (e:Event) => this.resetLayout());

    layoutContent.append(orientationP, selectDiv, nodeP, nodeSep, edgeP, edgeSep, rankP, rankSep, confirmButton);
    layoutPopup.appendChild(layoutContent);

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
    fileInput.accept = "application/JSON,.pnml";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", (e:Event) => this.showFileName());

    var label = document.createElement("label");
    label.htmlFor = "fileInput";
    label.className = "uploadLabel"
    label.textContent = "JSON or PNML-File...";

    var uploadJSON = document.createElement("button");
    uploadJSON.id = "uploadJSON";
    uploadJSON.className = "button button1";
    uploadJSON.textContent = "Import Graph!";
    uploadJSON.addEventListener("click", (e:Event) => PetriView.importJSON()); 

    uploadPopupContent.append(label, fileInput, uploadJSON);
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

    linkPopupContent.append(linkInput, changeProb);
    linkPopup.appendChild(linkPopupContent);

    // LABEL-POPUP
    var popup = document.createElement("div");
    popup.id = "popup";
    popup.className = "popup";
    popup.style.display = "none";

    var headerText = document.createElement("p");
    headerText.textContent = "Label:";

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
    changeLabel.textContent = "Save!";

    var headerText1 = document.createElement("p");
    headerText1.id = "timeLabel";
    headerText1.textContent = "Duration in seconds:";
    headerText1.style.display = "none";

    var addTime = document.createElement("input");
    addTime.placeholder = "In seconds...";
    addTime.id = "timeInput";
    addTime.type = "number";
    addTime.min = "1";
    addTime.defaultValue = "1";
    addTime.style.display = "none";
    
    var popupContent = document.createElement("div");
    popupContent.className = "popup-content";

    popupContent.append(headerText, input, headerText1, addTime, changeLabel);
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
    addConditions.addEventListener("click", (e:Event) => PetriView.saveConditions());

    var condPopupContent = document.createElement("div");
    condPopupContent.className = "popup-content";

    condPopupContent.append(description, conditions, addConditions);
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

    savePopupContent.append(saveInput, saveGraphAs);
    savePopup.appendChild(savePopupContent);

    // ADD EVERYTHING TO NOTEBOOK HTML CODE
    this.el.append(dropdown, saveGraph, importJSON, saveIMG, downloadJSON, zoomIn, zoomOut, addPlace,
                   addTrans, addToken, removeToken, setLayout, clearAll, lockModel, simulate, 
                   stopSimulation, reloadSim, addAttrs);
    this.el.append(popup, linkPopup, savePopup, uploadPopup, downPopup, condPopup, attrPopup, layoutPopup);

    // Init paper, give it the respective ID, restrict its elements moving area and append it
    this.initWidget();
    PetriView.paper.el.id = "paper";
    PetriView.paper.options.restrictTranslate = function(cellView) { return cellView.paper!.getArea(); }
    this.el.appendChild(PetriView.paper.el);

    // If clicked outside of any popup-form, do not display it anymore (under conditions)
    window.onclick = function(event: MouseEvent) {
      if (PetriView.selectedCell) {
        if ((event.target! as Element).className === "popup" && (PetriView.selectedCell.attributes.type != "customTransition" ||
            PetriView.selectedCell.attributes.attrs["label"]["text"] != "")) {
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
      'blank:pointermove element:pointermove': function(event) {
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
              var connect = true;
              var coordinates = new joint.g.Point(x, y);
              var elementAbove = cellView.model;
              var elementBelow = this.model.findModelsFromPoint(coordinates).find(function(cell: joint.dia.Cell) {
                  return (cell.id !== elementAbove.id)
              });

              if (typeof(elementAbove) == 'undefined') {
                PetriView.graph.getConnectedLinks(elementBelow!).forEach(link => {
                  if (link.attributes.source.id == elementAbove.id) {
                    connect = false;
                  }
                });
              }

              // If the two elements are connected in that direction already or have the same cell type, don't connect them (again).
              if (elementBelow && (elementAbove.attributes.type != elementBelow.attributes.type) &&
                  (elementAbove.attributes.type != "pn.Link") && (elementBelow.attributes.type != "pn.Link") && connect) {
                  
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
                        action: function(evt) {
                          if (elementView.model.attributes.type == "customTransition") {
                            var transName = elementView.model.attributes.attrs!["label"]!["text"];
                            PetriView.eventAttrs = PetriView.eventAttrs.filter(attr => attr.split(" -> ")[0] !== transName);
                            PetriView.updateAttrsFrontend("eventAttrsList");
                          }
                          elementView.model.remove({ ui: true });
                          PetriView.updateTransList();
                        },
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

        } else if (PetriView.selectedCell.attributes.type == "pn.Place") {
          document.getElementById("timeLabel")!.style.display = "none";
          document.getElementById("timeInput")!.style.display = "none";
          $("#changelabel").prop("disabled", false);
          PetriView.showPopup("popup");

        } else if (PetriView.selectedCell.attributes.type == "customTransition" && PetriView.selectedCell.attributes.attrs["body"]["text"] != "") {
          document.getElementById("timeLabel")!.style.display = "flex";
          document.getElementById("timeInput")!.style.display = "flex";
          (<HTMLInputElement> document.getElementById("timeInput")!).value = PetriView.selectedCell.attributes.exectime;
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
        if (PetriView.selectedCell) {
          if (PetriView.selectedCell.attributes.type == "pn.Place") {
            PetriView.selectedCell.attr({".root": { "stroke": "#7c68fc" }});
          } else { PetriView.selectedCell.attr({"body": { "stroke": "#7c68fc" }}); }
        }

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
    PetriView.graph.on('change:property', this.updateGraph.bind(this), this);
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
      drawGrid: false,
      gridSize: PetriView.gridSize,
      defaultAnchor: { name: 'perpendicular' },
      defaultConnectionPoint: { name: 'boundary' },
      model: PetriView.graph,
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

  private updateCaseAttrs() {
    this.model.set("caseAttrs", PetriView.caseAttrs);
    this.model.save_changes();
    this.model.sync("update", this.model);
  }

  private updateGraph() {
    var allCells = PetriView.graph.getCells();
    // allCells.concat(PetriView.graph.getLinks());
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
        var exectime = cell.attributes.exectime;
        var eventattrs = cell.attributes.eventAttrs;
        var conditions: String[] = [];
        cell.attributes.ports.items.forEach(function(item: any) {
          conditions.push(item["attrs"]["portLabel"]["text"]);
        });
        res.push({type, id, name, exectime, conditions, eventattrs});
      }
    });

    PetriView.updateTransList();
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
      if (newZoom >= MIN_ZOOM && newZoom <= MAX_ZOOM) {
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

    this.updateGraph();
    PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells());
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

    this.updateGraph();
    PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells())
  }

  private static link(a: any, b: any) {
    return new joint.shapes.pn.Link({
        source: { id: a.id, selector: '.root' },
        target: { id: b.id, selector: '.root' },
        // creates little jumps over other links
        connector: { name: 'jumpover',
                     args: { size: 5 }
        },
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
          '.connection-wrap': {
            'fill': 'none'
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

    // set focus to first input-field in popup
    if (id != "layoutPopup" && id != "downloadPopup") {
      var inputField = document.getElementById(id)?.getElementsByTagName("input")[0]!;
      document.getElementById(inputField.id)!.focus();

      // Set value of labelPopup-Input based on selected Link
      // slice creates a copy of last element --> so actually "labels" is not changed by "pop()"
      if (id=="linkPopup") {
        inputField.value = PetriView.selectedCell.attributes.labels.slice(-1).pop()["attrs"]["text"]["text"];
      }
    }
  }

  private addPlace() {
    var x = PetriView.paper.paperToLocalPoint(0, 0).x + 20;
    var y = PetriView.paper.paperToLocalPoint(0, 0).y + 20;

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
      position: { x: x, y: y }
    }));
    PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells())
    this.updateGraph();
  }

  private addTrans() {
    var x = PetriView.paper.paperToLocalPoint(0, 0).x + 90;
    var y = PetriView.paper.paperToLocalPoint(0, 0).y + 35;

    if (PetriView.selectedCell) {
      if (PetriView.selectedCell.attributes.type == "pn.Place") {
        PetriView.selectedCell.attr({".root": { "stroke": "#7c68fc" }});
      } else { PetriView.selectedCell.attr({"body": { "stroke": "#7c68fc" }}); }
    }
    
    PetriView.selectedCell = new customTransition({
      position: { x: x, y: y }
    });
    PetriView.graph.addCell(PetriView.selectedCell);
    document.getElementById("timeLabel")!.style.display = "flex";
    document.getElementById("timeInput")!.style.display = "flex";
    PetriView.showPopup("popup");
    this.updateGraph();
  }

  private resetLayout() {
    $("#layoutPopup").css("display", "none");

    var nodeSep = Number($("#nodeSepInput").prop("value"));
    var edgeSep = Number($("#edgeSepInput").prop("value"));
    var rankSep = Number($("#rankSepInput").prop("value"));
    var orientation = $("#layoutDir").prop("value");
    var options = { dagre: dagre, graphlib: graphlib, nodeSep: nodeSep, edgeSep: edgeSep, 
                    rankSep: rankSep, rankDir: orientation, setVertices: true, marginX: 20, marginY: 30 };
    joint.layout.DirectedGraph.layout(PetriView.graph, options);
  }

  private clearAll() {
    // Reset Zoom and empty Graph
    PetriView.paper.translate(0, 0);
    PetriView.paper.scale(1, 1, 0, 0);
    PetriView.graph.clear();
    PetriView.updateTransList();
    this.updateGraph();

    // Delete all Event-Attributes!
    $("#eventAttrsList").empty();
    PetriView.eventAttrs = [];
  }

  private simulate() {
    var transitions: any[] = []
    for (const c of PetriView.graph.getCells()) {
        if (c.attributes.type == "customTransition") {
            transitions.push(c);
        }
    }
    // shuffle transitions to randomize which one is chosen first
    transitions = transitions.map((value) => ({ value, sort: Math.random() }))
                                 .sort((a, b) => a.sort - b.sort)
                                 .map(({ value }) => value);

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
    } else {
      document.querySelector('#lock')!.innerHTML = '<i class="fa fa-unlock"></i>' + " Lock"
      PetriView.paper.setInteractivity(function() { return true });
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

  private static parsePNML(xmlPnml: any) {
    var placePos = new Set<number>();
    var transPos = new Set<number>();
    for (let childId in xmlPnml.childNodes) {
      let child: any = xmlPnml.childNodes[childId];
      if (child.tagName == "net") {
        for (let child2Id in child.childNodes) {
          let child2 = child.childNodes[child2Id];
          if (child2.tagName == "caseattr") {
            PetriView.caseAttrs.push(child2.getAttribute("label"));
          }
        }
        PetriView.parsePNML(child);
      } else if (child.tagName == "page") {
        PetriView.parsePNML(child);
      }
      else {
        if (child.tagName == "place") {
          let placeId = child.getAttribute("id");
          var placeName = "";
					var placeTokens = 0;
          var xPos = 20;
          var yPos = 25;

          for (let child2Id in child.childNodes) {
						let child2 = child.childNodes[child2Id];
						if (child2.tagName == "name") {
							for (let child3Id in child2.childNodes) {
								let child3 = child2.childNodes[child3Id];
								if (child3.tagName == "text") {
									placeName = child3.textContent;
								}
							}
						}
            else if (child2.tagName == "graphics") {
              for (let child3Id in child2.childNodes) {
                let child3 = child2.childNodes[child3Id];
                if (child3.tagName == "position") {
                  xPos = parseInt(child3.getAttribute("x"))*10;
                  yPos = parseInt(child3.getAttribute("y"))*10;
                }
              }
            }
						else if (child2.tagName != null && child2.tagName.toLowerCase() == "initialmarking") {
							for (let child3Id in child2.childNodes) {
								let child3 = child2.childNodes[child3Id];
								if (child3.tagName == "text") {
									placeTokens = parseInt(child3.textContent);
								}
							}
						}
					}
          let newPlace = new joint.shapes.pn.Place(
            {attrs: 
              {'.label': {'text': placeName, 'fill': '#7c68fc'},
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
            tokens: placeTokens,
            position: { x: xPos, y: yPos },
            id: placeId
          });
          PetriView.graph.addCell(newPlace);
          placePos.add(xPos).add(yPos);
        }

        else if (child.tagName == "transition") {
          let transId = child.getAttribute("id");
					var transLabel = transId;
          var xPos = 20;
          var yPos = 25;
          var conditions = [];
          var eventattrs = [];

          for (let child2Id in child.childNodes) {
						let child2 = child.childNodes[child2Id];
						if (child2.tagName == "name") {
							for (let child3Id in child2.childNodes) {
								let child3 = child2.childNodes[child3Id];
								if (child3.tagName == "text") {
									transLabel = child3.textContent;
                }
							}
						}
            else if (child2.tagName == "toolspecific") {
              if (child2.getAttribute("tool") == "ipypetrinet") {
                var exectime = child2.getAttribute("exectime");
                for (let child3Id in child2.childNodes) {
                  let child3 = child2.childNodes[child3Id];
                  if (child3.tagName == "condition") {
                    conditions.push(child3.getAttribute("label"));
                  }
                  else if (child3.tagName == "eventattr") {
                    eventattrs.push(child3.getAttribute("label"));
                  }
                }
              }
            }
            else if (child2.tagName == "graphics") {
              for (let child3Id in child2.childNodes) {
                let child3 = child2.childNodes[child3Id];
                if (child3.tagName == "position") {
                  xPos = parseInt(child3.getAttribute("x"))*10;
                  yPos = parseInt(child3.getAttribute("y"))*10;
                }
              }
            }
          }
          let newTrans = new customTransition({
            attrs: {
              label: {
                text: transLabel
              }
            },
            exectime: exectime,
            eventAttrs: eventattrs,
            position: { x: xPos, y: yPos },
            id: transId,
          });
          conditions.forEach( (cond: string) => { newTrans.addDefaultPort(cond); });
          PetriView.graph.addCell(newTrans);
          transPos.add(xPos).add(yPos);
        }

        else if (child.tagName == "arc") {
          // Dictonaries only to be able to use existing PetriView.link function
          let arcSource = {id: child.getAttribute("source")};
					let arcTarget = {id: child.getAttribute("target")};
					var arcProb = "1.00";

					for (let child2Id in child.childNodes) {
						let child2 = child.childNodes[child2Id];
						if (child2.tagName == "name") {
							for (let child3Id in child2.childNodes) {
								let child3 = child2.childNodes[child3Id];
								if (child3.tagName == "text") {
									arcProb = child3.textContent;
								}
							}
						}
					}

          var newLink = PetriView.link(arcSource, arcTarget);
          newLink.attributes.labels.pop();
          newLink.appendLabel({
            attrs: {text: { text: arcProb }},
            position: {distance: 0.5, args: { keepGradient: true, ensureLegibility: true }}
          });
          PetriView.graph.addCell(newLink);
				}
      }
    }
    PetriView.graph.getCells().forEach((cell) => {
      
    })
    
    // Check if auto-layout should apply (note that the method is called recursive, so != 0 is crucial)
    if ((placePos.size <= 2 && placePos.size != 0) || (transPos.size <= 2 && transPos.size != 0)) {
      joint.layout.DirectedGraph.layout(PetriView.graph, { dagre: dagre, graphlib: graphlib, setVertices: true, marginX: 20, marginY: 30 });
    }
  }

  private static importJSON() {
    PetriView.paper.translate(0, 0);
    PetriView.paper.scale(1, 1, 0, 0);
    PetriView.showTab("caseTab");
    PetriView.eventAttrs = [];
    PetriView.updateAttrsFrontend("caseAttrsList");

    var files = (<HTMLInputElement> document.getElementById("fileInput")).files!;
    if (files.length <= 0) {
      return false;
    }

    let fileType = files[0]["name"].split(".")[1];
    var reader = new FileReader();
    reader.onload = function(e: any) { 
      if (fileType == "pnml") {
        PetriView.graph.clear();
        PetriView.caseAttrs = [];
        let parser = new DOMParser();
        var xmlDoc = parser.parseFromString(e.target.result, "text/xml");
        let xmlPnml = xmlDoc.getElementsByTagName("pnml")[0];

        PetriView.parsePNML(xmlPnml);
        PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells());
        PetriView.updateAttrsFrontend("caseAttrsList");
      }
      else {
        var jsonstring = JSON.parse(e.target.result);
        PetriView.caseAttrs = jsonstring["caseAttributes"]? jsonstring["caseAttributes"]: [];
        PetriView.updateAttrsFrontend("caseAttrsList");

        delete jsonstring["caseAttributes"];
        PetriView.graph.fromJSON(jsonstring);
        PetriView.backupTokens = PetriView.getTokenlist(PetriView.graph.getCells());
      }

      PetriView.graph.getCells().forEach(function(c) {
        if (c.attributes.type == "customTransition") {
          // Just to trigger PetriView.graph.on("change", ...)
          c.attr({"body": { "stroke": "#7c68fc" }});

          c.attributes.eventAttrs.forEach(function(event: string) {
            PetriView.eventAttrs.push(c.attributes.attrs!["label"]!["text"] + " -> " + event);
          });
        }
      });

      PetriView.updateAttrsFrontend("eventAttrsList");
      document.getElementById("uploadPopup")!.style.display = "none";
      var fileName = files[0]["name"].split(".")[0]; 
      
      // Check for links existing with the same fileName and overwrite them
      if ($("a").filter(function() { return $(this).text() == fileName}).length == 0) {
        var newLink = document.createElement("a");
        newLink.textContent = fileName;
        if (fileType == "pnml") {
          localStorage.setItem(fileName, JSON.stringify(PetriView.graph));
          newLink.addEventListener("click", (e:Event) => PetriView.unPNMLify(fileName));
        }
        else {
          localStorage.setItem(fileName, e.target.result);
          newLink.addEventListener("click", (e:Event) => PetriView.unJSONify(fileName));
        }
        document.getElementById("dropdown-content")!.appendChild(newLink);
      }
    }
    
    reader.readAsText(files.item(0)!);
  }

  private downloadPNML() {
    var pnmlString = '<?xml version="1.0" encoding="ISO-8859-1"?>\n\
                      <pnml>\
                        <net id="net" type="https://www.pnml.org">';
    PetriView.caseAttrs.forEach((caseAttr) => { pnmlString += ` <caseattr label='${caseAttr.replace("<", "&lt;").replace(">", "&gt;")}'/>` });
    pnmlString += '<name>\
                     <text>PetriNet</text>\
                   </name>\
                   <page id="Page0">\
                     <name>\
                       <text/>\
                     </name>';
    PetriView.graph.getCells().forEach(function(cell: any) {
      if (cell.attributes.type == "pn.Place") {
        var id = cell.attributes.id;
        var name = cell.attributes.attrs[".label"]["text"];
        var tokens = cell.attributes.tokens;
        var width = cell.attributes.size["width"];
        var height = cell.attributes.size["height"];
        var x = cell.attributes.position["x"]/10;
        var y = cell.attributes.position["y"]/10;
        pnmlString += `<place id="${id}">\
                        <name>\
                          <text>${name}</text>\
                        </name>\
                        <toolspecific tool="ipypetrinet"/>\
                        <graphics>\
                          <position x="${x}" y="${y}"/>\
                          <dimension x="${width}" y="${height}"/>\
                        </graphics>\
                        <initialMarking>\
                          <text>${tokens}</text>\
                        </initialMarking>\
                      </place>`;
      } else if (cell.attributes.type == "customTransition") {
        var id = cell.id;
        var name = cell.attributes.attrs!["label"]!["text"];
        var width = cell.attributes.size["width"];
        var height = cell.attributes.size["height"];
        var x = cell.attributes.position["x"]/10;
        var y = cell.attributes.position["y"]/10;
        var exectime = cell.attributes.exectime;
        var eventattrs = cell.attributes.eventAttrs;
        var conditions: String[] = [];
        cell.attributes.ports.items.forEach(function(item: any) {
          conditions.push(item["attrs"]["portLabel"]["text"].replace("<", "&lt;").replace(">", "&gt;"));
        });
        pnmlString += `<transition id="${id}">\
                        <name>\
                          <text>${name}</text>\
                        </name>\
                        <toolspecific tool="ipypetrinet" exectime="${exectime}">`
        conditions.forEach((cond) => { pnmlString += ` <condition label='${cond}'/>` });
        eventattrs.forEach((eventAttr: any) => { pnmlString += ` <eventattr label='${eventAttr.replace("<", "&lt;").replace(">", "&gt;")}'/>` })
        pnmlString += `</toolspecific><graphics>\
                        <position x="${x}" y="${y}"/>\
                        <dimension x="${width}" y="${height}"/>\
                        <fill color="#9586fd"/>\
                      </graphics>\
                      </transition>`;
      }
    });

    PetriView.graph.getLinks().forEach(function(link: any) {
        var id = link.attributes.id;
        var prob = link.attributes.labels[0]["attrs"]["text"]["text"];
        var source = link.attributes.source.id;
        var target = link.attributes.target.id;
        pnmlString += `<arc id="${id}" source="${source}" target="${target}">\
                        <name>\
                          <text>${prob}</text>\
                        </name>\
                        <toolspecific tool="ipypetrinet"/>\
                        <arctype>\
                          <text>normal</text>\
                        </arctype>\
                      </arc>`;
    });

    pnmlString += `</page><finalmarkings><marking></marking></finalmarkings></net></pnml>`;
    let blob = new Blob([pnmlString], {type: 'data:.pnml;charset=utf-8'});
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.setAttribute('download', 'PetriNet.pnml');
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.click();

    document.getElementById("DownloadPopup")!.style.display = "none";
  }

  private downloadJSON() {
    var jsonstring = JSON.stringify(PetriView.graph.toJSON());

    if (jsonstring == null) {
      console.log("There is no JSON file to be saved.");
    } else {
      // Add Case-Attributes to String if not empty
      if (PetriView.caseAttrs) {
        var caseString = "";
        caseString += ',"caseAttributes":[';
        var i = 0;
        PetriView.caseAttrs.forEach(function(attr) {
          caseString += '"' + attr + '"';
          if (i<PetriView.caseAttrs.length-1) {
            caseString += ",";
          } else {
            caseString += "]"
          }
        });
        jsonstring = jsonstring.substring(0, jsonstring.length-1) + caseString + "}";
      }

      let blob = new Blob([jsonstring], {type: 'data:text/json;charset=utf-8'});
      let url = URL.createObjectURL(blob);

      let a = document.createElement("a");
      a.setAttribute('download', 'graph.json');
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.click();
    }
    document.getElementById("DownloadPopup")!.style.display = "none";
  }

  private static unPNMLify(fileName: string) {
    PetriView.graph.clear();
    const pnmlString = localStorage.getItem(fileName)!;
    PetriView.graph.fromJSON(JSON.parse(pnmlString));

    // let parser = new DOMParser();
    // var xmlDoc = parser.parseFromString(pnmlString, "text/xml");
    // let xmlPnml = xmlDoc.getElementsByTagName("pnml")[0];
    // PetriView.parsePNML(xmlPnml);
  }

  private static unJSONify(fileName: string) {
    const jsonstring = localStorage.getItem(fileName)!;
    PetriView.graph.fromJSON(JSON.parse(jsonstring));
  }

  private saveIMG() {
    // make sure the link-tools are disabled for a clean SVG
    $(".marker-arrowhead").css("display", "none");
    $(".tool-remove").css("display", "none");
    $(".tool-options").css("display", "none");
    $(".marker-vertices").css("display", "none");

    let svg = (<Node> document.querySelector('svg'));
    if (svg == null) {
      console.log("There is no SVG to be saved.");
    } else {
      let data = (new XMLSerializer()).serializeToString(svg);
      let blob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');

      a.setAttribute('download', 'image.svg');
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.click();
    }

    // reenable certain options again
    $(".marker-arrowhead").css("display", "flex");
    $(".tool-remove").css("display", "flex");
    $(".marker-vertices").css("display", "flex");
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

    if (PetriView.selectedCell.attributes.type == "customTransition") {
      PetriView.selectedCell.attributes.exectime = (<HTMLInputElement> document.getElementById("timeInput")!).value
    }
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

  private addAttributes() {
    var attr = $("#attrName").val();
    var checked = $("input[name='dist']:checked").prop("id");
    var isEvtTab = document.getElementsByClassName("tablinks active")[0].id=="eventTab";
    if (isEvtTab) {
      var trans = document.getElementsByClassName("transListEl active")[0].getElementsByTagName("li")[0].innerHTML;
    }

    if (checked=="staticAttr") {
      var staticVal = $("#staticVal").val();
      var p = $("#staticProbs").val();
      (staticVal == "")? staticVal=[]: [staticVal];
      if (p == "") {
        var str = `${attr}: np.random.choice([${staticVal}])`;
      } else {
        var str = `${attr}: np.random.choice([${staticVal}], p=[${p}])`;
      }
      
    } else if (checked=="normalDist") {
      var mue = $("#mue").val();
      var sigma = $("#sigma").val();
      (mue == "")? mue="1": mue;
      (sigma == "")? sigma="0.5": sigma;
      var str = `${attr}: np.random.normal(loc=${mue}, scale=${sigma})`;
    } else if (checked=="bernDist") {
      var n = $("#n").val();
      var p = $("#p").val();
      (n == "")? n="1": n;
      (p == "")? p="0.5": p;
      var str = `${attr}: np.random.binomial(n=${n}, p=${p})`;
    } else if (checked=="gammaDist") {
      var k = $("#k").val();
      var theta = $("#theta").val();
      (k == "")? k="9": k;
      (theta == "")? theta="0.5": theta;
      var str = `${attr}: np.random.gamma(shape=${k}, scale=${theta})`;
    } else if (checked=="expoDist") {
      var beta = $("#beta").val();
      (beta == "")? beta="3": beta;
      var str = `${attr}: np.random.exponential(scale=${beta})`;
    }

    if (isEvtTab) {
      PetriView.eventAttrs.push(trans! + " -> " + str!);
      PetriView.updateGraphEventAttrs();
      PetriView.updateAttrsFrontend("eventAttrsList");
    } else {
      PetriView.caseAttrs.push(str!);
      PetriView.updateAttrsFrontend("caseAttrsList");
    }

    this.updateGraph();
    PetriView.resetDistForms();
  }

  private toggleFields(id: String) {
    $('#staticVal, #staticProbs, #mue, #sigma, #n, #p, #k, #theta, #beta').css("display", "none");
    this.enableAttributeButtons();

    if (id == "staticAttr") {
      $("#staticVal").css("display", "flex");
      $("#staticProbs").css("display", "flex");
    } else if (id == "normalDist") {
      $("#mue").css("display", "flex");
      $("#sigma").css("display", "flex");
    } else if (id == "bernDist") {
      $("#n").css("display", "flex");
      $("#p").css("display", "flex");
    } else if (id == "gammaDist") {
      $("#k").css("display", "flex");
      $("#theta").css("display", "flex");
    } else if (id == "expoDist") {
      $("#beta").css("display", "flex");
    }
  }

  private enableAttributeButtons() {
    var radioChecked = $("input[name='dist']:checked").prop("id");

    // Do if EventTab is active
    if ($("#eventTab").prop("className") == "tablinks active") {
      var checkTrans = document.getElementsByClassName("transListEl active").length > 0
      if (checkTrans && radioChecked && $("#attrName").prop("value")) {
        $("#addEventAttributes").prop("disabled", false);
      } else {
        $("#addEventAttributes").prop("disabled", true);
      }
    // Do if CaseTab is active
    } else {
      if (radioChecked && $("#attrName").prop("value")) {
        $("#addCaseAttributes").prop("disabled", false);
      } else {
        $("#addCaseAttributes").prop("disabled", true);
      }
    }
  }

  private static updateAttrsFrontend(id: string) {
    var list = [];
    $(`#${id}`).empty();
    (id=="caseAttrsList")? list=PetriView.caseAttrs: list=PetriView.eventAttrs;

    list.forEach(function (item: any) {
      var listEl = document.createElement("div");
      listEl.style.display = "flex";

      let li = document.createElement('li');
      li.innerHTML = item;

      var dismissButton = document.createElement("button");
      dismissButton.className = "dismissbutton";
      dismissButton.innerHTML = "<i class='fa fa-times-circle'></i>";
      dismissButton.addEventListener("click", (e:Event) => PetriView.deleteListEl(id, item));

      listEl.append(dismissButton, li);
      document.getElementById(id)!.appendChild(listEl);
    });
  }

  private static deleteListEl(id: string, content: any) {
    if (id=="caseAttrsList") {
      PetriView.caseAttrs.forEach(function(el: string, index: any) {
        if (content == el) {
          PetriView.caseAttrs.splice(index, 1);
        }
      });
    } else {
      PetriView.eventAttrs.forEach(function(el: string, index: any) {
        if (content == el) {
          PetriView.eventAttrs.splice(index, 1);
        }
      });
      PetriView.updateGraphEventAttrs();
    }
    PetriView.updateAttrsFrontend(id);
  }

  private static updateGraphEventAttrs() {
    PetriView.graph.getCells().forEach(function(c) {
      if (c.attributes.type == "customTransition") {
        c.attributes.eventAttrs = [];
        PetriView.eventAttrs.forEach(function(item) {
          var event = item.replace(": ", "=").split(" -> ");
          if (event[0] == c.attributes.attrs!["label"]!["text"]) { c.attributes.eventAttrs.push(event[1]) }
        });
      }
    });
    PetriView.graph.set('cellNamespace', joint.shapes);
  }

  private static resetDistForms() {
    (<HTMLInputElement> document.getElementById("addCaseAttributes")).disabled = true;
    (<HTMLInputElement> document.getElementById("addEventAttributes")).disabled = true;
    $("#attrName").prop("value", "");
    $("input[name=dist]").prop("checked", false);
    $("#staticVal, #staticProbs, #mue, #sigma, #n, #p, #k, #theta, #beta").css("display", "none");
    $("#staticVal, #staticProbs, #mue, #sigma, #n, #p, #k, #theta, #beta").prop("value", "");
  }

  private static showTab(id: string) {
    PetriView.resetDistForms();
    $("#caseTab, #eventTab").prop("className", "tablinks");
    $("#caseTabContent, #eventTabContent").css("display", "none");

    if (id=="eventTab") {
      PetriView.updateTransList();
      $("#eventTabContent").css("display", "block");
      $("#eventTab").prop("className", "tablinks active");
    } else if (id=="caseTab") {
      $("#caseTabContent").css("display", "block");
      $("#caseTab").prop("className", "tablinks active");
    }
  }

  private static updateTransList() {
    $("#transList").empty();
    var transitions: any = [];

    PetriView.graph.getCells().forEach(function(c) {
      if (c.attributes.type == "customTransition") {
        transitions.push(c.attributes.attrs!["label"]!["text"]);
      }
    });

    transitions.forEach(function (trans: string) {
      var listEl = document.createElement("div");
      listEl.className = "transListEl";
      listEl.style.display = "flex";
      listEl.style.cursor = "pointer";
      listEl.addEventListener("click", (e:Event) => PetriView.selectTrans(listEl));

      let li = document.createElement('li');
      li.innerHTML = trans;

      var addEventAttrButton = document.createElement("button");
      addEventAttrButton.className = "dismissbutton";
      addEventAttrButton.innerHTML = "<i class='fa fa-plus-circle'></i>";

      listEl.append(addEventAttrButton, li);
      document.getElementById("transList")!.appendChild(listEl);
    });

    if (document.getElementById("transList")!.innerHTML.trim() == "") {
      document.getElementById("eventHeader")!.textContent = "Currently there are no transitions available."
    } else {
      document.getElementById("eventHeader")!.textContent = "Select the transition to be linked:"
    }
  }

  private static selectTrans(div: any) {
    var activeElements = Array.from(document.getElementsByClassName("transListEl active"));
    activeElements.forEach((el: any) => {
      el.style.backgroundColor = "white";
      el.className = "transListEl";
    });    
    div.style.backgroundColor = "#DCDCDC";
    div.className = "transListEl active";

    // check if button should be enabled
    var checkTrans = document.getElementsByClassName("transListEl active").length > 0;
    var checkRadio = $("input[name='dist']:checked").prop("id");
    if (checkTrans && $("#attrName").val() != "" && checkRadio) {
      $("#addEventAttributes").prop("disabled", false);
    } else {
      $("#addEventAttributes").prop("disabled", true);
    }
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