#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jakob Bucksch.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget, ValueWidget, register
from traitlets import Unicode, Bool, validate, TraitError, List
from ._frontend import module_name, module_version

# from pm4py.objects.petri_net.obj import PetriNet, Marking
# from pm4py.objects.petri_net.utils import petri_utils, reachability_graph
# from pm4py.visualization.petri_net import visualizer as pn_visualizer
# from pm4py.visualization.transition_system import visualizer as ts_visualizer
# from pm4py.algo.simulation.playout.petri_net import algorithm as simulator
# from pm4py.objects.conversion.log import converter as log_converter

@register
class PetriWidget(DOMWidget):
    """ A custom Petrinet-Widget. """

    _model_name = Unicode('PetriModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('PetriView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    graph = List().tag(sync=True)

    # Methods to simulate an eventlog
    # def generate_eventlog(self, cells, name="PetriNet", n=10):
    #     def add_nodes(net, trans, placelist):
    #         transitions = []
    #         places = []
            
    #         for t in trans:
    #             new_trans = PetriNet.Transition(t[0], label=t[1], properties=t[1])
    #             net.transitions.add(new_trans)
    #             transitions.append(new_trans)
                
    #         for p in placelist:
    #             new_place = PetriNet.Place(p[0], properties=[p[1],p[2]])
    #             net.places.add(new_place)
    #             places.append(new_place)
                
    #         return transitions, places

    #     def get_places_by_name(net, place_name):
    #         for p in net.places:
    #             if p.name == place_name:
    #                 return p
    #         return None

    #     def get_init_token(net):
    #         tokenplaces = []
    #         for p in net.places:
    #             if p.properties[1] != 0:
    #                 tokenplaces.append((p, p.properties[1]))
    #         return tokenplaces
            
    #     def add_links(net, translist, placelist, links):
    #         for l in links:
    #             source = petri_utils.get_transition_by_name(net, l[0])
    #             target = get_places_by_name(net, l[1])
    #             if not source:
    #                 source = get_places_by_name(net, l[0])
    #                 target = petri_utils.get_transition_by_name(net, l[1])
                
    #             petri_utils.add_arc_from_to(source, target, net)

    #     place_names = []
    #     trans_names = []
    #     links = []
    #     net = PetriNet(name)
        
    #     for c in cells:
    #         if c["type"] == "Place":
    #             place_names.append((c["id"], c["name"], c["tokens"]))
    #         elif c["type"] == "Transition":
    #             trans_names.append((c["id"], c["name"]))
    #         else:
    #             links.append((c["source"], c["target"])) 
        
    #     trans, places = add_nodes(net, trans_names, place_names)
    #     add_links(net, trans, places, links)
        
    #     # Might be to much for our purposes - designed for cases where each place
    #     # can contain any number of tokens...
    #     initial_marking = Marking()
    #     tokenplaces = get_init_token(net)
    #     for tp in tokenplaces:
    #         initial_marking[tp[0]] = tp[1]
        
    #     gviz = pn_visualizer.apply(net, initial_marking)
    #     pn_visualizer.view(gviz)
        
    #     simulated_log = simulator.apply(net, initial_marking, variant=simulator.Variants.BASIC_PLAYOUT, 
    #                                     parameters={
    #                                         simulator.Variants.BASIC_PLAYOUT.value.Parameters.NO_TRACES: n
    #                                     })
    #     df = log_converter.apply(simulated_log, variant=log_converter.Variants.TO_DATA_FRAME)
    #     return df

    # TODO: Code untendrunter entfernen

    # value = Unicode('example@example.com').tag(sync=True)
    # disabled = Bool(False, help="Enable or disable user changes.").tag(sync=True)

    # # Basic validator for the email value
    # @validate('value')
    # def _valid_value(self, proposal):
    #     if proposal['value'].count("@") != 1:
    #         raise TraitError('Invalid email value: it must contain an "@" character')
    #     if proposal['value'].count(".") == 0:
    #         raise TraitError('Invalid email value: it must contain at least one "." character')
    #     return proposal['value']

