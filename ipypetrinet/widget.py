#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jakob Bucksch.
# Distributed under the terms of the Modified BSD License.

import time
import random
import datetime
import numpy as np
import pandas as pd

from datetime import timedelta
from ipywidgets import DOMWidget, register
from traitlets import Unicode, List
from ._frontend import module_name, module_version

from copy import copy
from pm4py.objects.log import obj as log_instance
from pm4py.objects.petri_net.utils import petri_utils
from pm4py.objects.petri_net.obj import PetriNet, Marking
from pm4py.objects.conversion.log import converter as log_converter
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.objects.petri_net.utils import final_marking as final_marking_discovery


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
    caseAttrs = List().tag(sync=True)


    def add_nodes(self, net, trans, placelist):
        """ Adds places and transitions to a pm4py-petrinet """

        transitions = []
        places = []

        for t in trans:
            # t1=name, t2=conditions, t3=exectime, t4=eventattr
            labelstring = t[1] + " " + str(t[2]) + " " + str(t[4])
            new_trans = PetriNet.Transition(t[0], label=labelstring, properties=[t[2], t[3], t[4]])
            net.transitions.add(new_trans)
            transitions.append(new_trans)
        
        for p in placelist:
            new_place = PetriNet.Place(p[0], properties=[p[1],p[2]])
            net.places.add(new_place)
            places.append(new_place)
            
        return transitions, places

    def get_places_by_name(self, net, place_name):
        """ Gets place of pm4py-petrinet by name """

        for p in net.places:
            if p.name == place_name:
                return p
        return None

    def get_init_token(self, net):
        """ Obtains the inital tokens of a pm4py-petrinet """

        tokenplaces = []
        for p in net.places:
            if p.properties[1] != 0:
                tokenplaces.append((p, p.properties[1]))
        return tokenplaces
        
    def add_links(self, net, links):
        """ Adds links to a pm4py-petrinet """

        for l in links:
            source = petri_utils.get_transition_by_name(net, l[0])
            target = self.get_places_by_name(net, l[1])
            weight = l[2]
            if not source:
                source = self.get_places_by_name(net, l[0])
                target = petri_utils.get_transition_by_name(net, l[1])
            
            petri_utils.add_arc_from_to(source, target, net, weight=weight)
            
    def build_smap(self, translist, links):
        """ Builds a stochastic map """

        smap = {}
        for link in links:
            for trans in translist:
                # remember trans.name is the trans_id
                # and link[2] is the probability
                if link[1] == trans.name:
                    smap[trans] = link[2]
        return smap

    def get_unix_time(self, t=datetime.datetime(2021, 1, 1, 12, 0)):
        """ Returns the seconds since 01.01.1970 for a given datetime """

        return int(time.mktime(t.timetuple()))

    def pick_transition(self, et, smap):
        """ Picks a transition based on the stochastic map """

        if et == []:
            return None
        
        probability_dist = []
        for t in et:
            probability_dist.append(smap[t])

        # needs to be normalized for the following method
        prob_sum = sum(probability_dist)
        probability_dist = [x / prob_sum for x in probability_dist]

        chosen_t = list(np.random.choice(et, 1, p=probability_dist))[0]
        return chosen_t
        
    def is_enabled(self, t, pn, m):
        """ Checks whether a transition can fire based on marking """
        
        if t not in pn.transitions:
            return False
        else:
            for a in t.in_arcs:
                if m[a.source] < 1:
                    return False
                    
        return True

    def execute(self, t, m):
        """ Executes a transition if possible """

        # Always subtracts exactly one token from source!
        m_out = copy(m)
        for a in t.in_arcs:
            m_out[a.source] -= 1
            if m_out[a.source] == 0:
                del m_out[a.source]

        for a in t.out_arcs:
            m_out[a.target] += 1

        return m_out
    
    def enabled_transitions(self, pn, m):
        """ Return a set of enabled transitions (takes conditions into account) """
        
        maybeEnabled = set() 
        enabled = set()
        
        # Get all transitions enabled by provided tokens
        for t in pn.transitions:
            if self.is_enabled(t, pn, m):
                maybeEnabled.add(t)
                
        # Only keep transitions complying their conditions
        for trans in maybeEnabled:
            # Set/Override global Event-Attributes (of form "name=value")
            for attr in trans.properties[2]:
                exec(attr, globals())
            
            # Add transitions only if they meet their conditions (or conditions are None)
            if trans.properties[0]:
                cond_results = []
                for cond in trans.properties[0]:
                    cond_results.append(eval(cond))
                if all(cond_results):
                    enabled.add(trans)
            else:
                enabled.add(trans)
        
        return enabled
        
    def apply_playout(self, net, initial_marking, case_attrs=[], no_traces=100, max_trace_length=500,
                      case_id_key='id', activity_key='activity:name', timestamp_key='time:timestamp',
                      final_marking=None, smap=None, init_timestamp=1609502400, worktime=None, datafunc=None):
        
        """
        Do the playout of a Petrinet generating a log

        Parameters
        -------------------------------------------------------
        net
            PM4PY Petri net to play-out
        initial_marking
            Initial marking of the Petri net
        case_attrs
            Case Attributes of the Petri net, i.e. PetriWidget.caseAttrs
        no_traces
            Number of traces to generate
        max_trace_length
            Maximum number of events per trace (do break)
        case_id_key
            Trace attribute that is the case ID
        activity_key
            Event attribute that corresponds to the activity
        timestamp_key
            Event attribute that corresponds to the timestamp
        final_marking
            If provided, the final marking of the Petri net
        smap
            Stochastic map
        init_timestamp
            Timestamp in seconds to start at
        datafunc
            Method to generate dictionary of dictionaries
        """
        
        # infer the final marking from the net
        if final_marking is None:
            final_marking = final_marking_discovery.discover_final_marking(net)
        if smap is None:
            raise Exception("Please provide a stochastic map!")

        # assign an increased timestamp to each event starting at init_timestamp
        curr_timestamp = init_timestamp
        log = log_instance.EventLog()
        
        # get all event attributes from the net and store their names
        eventAttr_names = []
        for t in net.transitions:
            for attr in t.properties[2]:
                attr_name = attr.split("=")[0]
                eventAttr_names.append(attr_name)
        caseAttr_names = []
        for caseattr in case_attrs:
            caseAttr_names.append(caseattr.split(": ")[0])

        # dictionary containing the actual values of the event attrs
        event_attrs = {}
        
        for i in range(no_traces):
            # reset all event and case attributes for every trace
            for eventattr in eventAttr_names:
                exec('%s=%s' % (eventattr, None), globals())
                event_attrs[eventattr] = None
            for caseattr in case_attrs:
                exec(caseattr.replace(": ", "="), globals())

            datadicts = None
            if datafunc:
                datadicts = datafunc()
            
            trace = log_instance.Trace()
            trace.attributes[case_id_key] = str(i)
            visible_transitions_visited = []
            marking = copy(initial_marking)

            while len(visible_transitions_visited) < max_trace_length:
                # resets event_attr so it only is set for the respective activity
                # for eventattr in eventAttr_names:
                #     exec('%s=%s' % (eventattr, None), globals())
                #     event_attrs[eventattr] = None

                all_enabled_trans = self.enabled_transitions(net, marking)
                
                # supports nets with possible deadlocks
                if not all_enabled_trans:
                    break
                if final_marking is not None and marking == final_marking:
                    en_t_list = list(all_enabled_trans.union({None}))
                else:
                    en_t_list = list(all_enabled_trans)
                
                trans = self.pick_transition(en_t_list, smap)
                if trans is None:
                    break
                    
                if trans.label is not None:
                    # only update the value of the e_attrs corresponding to the chosen transition
                    for attr in trans.properties[2]:
                        attr_name = attr.split("=")[0]
                        event_attrs[attr_name] = eval(attr_name)

                    visible_transitions_visited.append(trans)
                    event = log_instance.Event()

                    # add duration of activity to datetime and make sure its in usual working times
                    date = datetime.datetime.fromtimestamp(curr_timestamp)
                    if worktime:
                        if date.hour >= worktime[1]:
                            diff = date.hour - worktime[1]
                            date = date.replace(hour=worktime[0])
                            date += timedelta(days=1, hours=diff)
                        if date.weekday() >= 5:
                            date += timedelta(days=7-date.weekday())

                        # update unix_time according to the possibly executed modifications
                        curr_timestamp = self.get_unix_time(date)

                    event[activity_key] = trans.label.split(" [", 1)[0]
                    event[timestamp_key] = date
                    
                    # add additional data attributes coming from custom function, event or case-attributes
                    if datadicts:
                        for dictname, dictvalue in datadicts.items():
                            if type(dictvalue) is dict:
                                if event[activity_key] in dictvalue.keys():
                                    actualValue = dictvalue[event[activity_key]]
                                    if np.issubclass_(type(actualValue), str):
                                        exec("%s='%s'" % (dictname, actualValue), globals())
                                    else:
                                        exec("%s=%s" % (dictname, actualValue), globals())
                                    event[dictname] = actualValue
                                else:
                                    event[dictname] = None
                            else:
                                if np.issubclass_(type(dictvalue), str):
                                    exec("%s='%s'" % (dictname, dictvalue), globals())
                                else:
                                    exec("%s=%s" % (dictname, dictvalue), globals())
                                event[dictname] = dictvalue

                    for e in event_attrs.keys():
                        event[e] = event_attrs[e]
                    for c in caseAttr_names:
                        event[c] = eval(c)
                    
                    trace.append(event)
                    meanTime = int(trans.properties[1])
                    lower, upper = int(meanTime*0.9), int(meanTime*1.1)+1
                    curr_timestamp += random.randrange(lower, upper)

                marking = self.execute(trans, marking)
            log.append(trace)

        return log

    def createPetriNet(self, graph, name="PetriNet"):
        ''' 
        Create a PM4PY Petri net
        
        Parameters
        ------------------------------------
        graph
            Cells of the created Petri net, i.e. PetriWidget.graph
        name
            Name of the generated pm4py-petrinet

        '''

        place_infos = []
        trans_infos = []
        links = []
        net = PetriNet(name)
        
        for c in graph:
            if c["type"] == "Place":
                place_infos.append([c["id"], c["name"], c["tokens"]])
            elif c["type"] == "Transition":
                trans_infos.append([c["id"], c["name"], c["conditions"], c["exectime"], c["eventattrs"]])
            else:
                links.append([c["source"], c["target"], c["prob"]])
        
        trans, _ = self.add_nodes(net, trans_infos, place_infos)
        self.add_links(net, links)

        initial_marking = Marking()
        tokenplaces = self.get_init_token(net)
        for tp in tokenplaces:
            initial_marking[tp[0]] = tp[1]

        return net, trans, links, initial_marking

    def drawPetriNet(self, graph, name="PetriNet"):
        ''' 
        Visualize the Petri net via gviz 
        
        Parameters
        -----------------------------------
        graph
            Cells of the created Petri net, i.e. PetriWidget.graph
        name
            Name of the generated pm4py-petrinet

        '''

        net, _, _, initial_marking = self.createPetriNet(graph, name=name)
        gviz = pn_visualizer.apply(net, initial_marking)
        pn_visualizer.view(gviz)

    def generate_eventlog(self, graph, case_attrs=[], name="PetriNet", no_traces=100, max_trace_length=500, draw=False, init_timestamp=1609502400, 
                          worktime=None, datafunc=None):
        ''' 
        Simulate an event log as pandas dataframe containing event- and case-attributes

        Parameters
        --------------------------------------------------------
        graph
            Cells of the created Petri net, i.e. PetriWidget.graph
        case_attrs
            Case attributes as list of strings as given in PetriWidget.caseAttrs
        name
            Name of the generated pm4py-petrinet
        no_traces
            Number of traces to simulate
        max_trace_length
            Maximum number of events per trace
        draw
            Specify if the Petri net should be drawn via gviz before simulating
        init_timestamp
            Timestamp to start the first event at in seconds.
            Use PetriWidget.get_unix_time() to reveive the correct number for a certain datetime.
            default = 1609502400 (= 01.01.2021 12:00)
        datafunc
            Method to generate dictonary of dictionaries for data attributes.
            This method will be executed once for every case! The result must conform to the following form:
            {data_attribute1: {activity_name1: respective_value1, activity_name2: respective_value2...}, ...}
        '''

        net, trans, links, initial_marking = self.createPetriNet(graph, name=name)
        smap = self.build_smap(trans, links)

        if draw:
            gviz = pn_visualizer.apply(net, initial_marking)
            pn_visualizer.view(gviz)
        
        simulated_log = self.apply_playout(net, initial_marking, case_attrs=case_attrs, init_timestamp=init_timestamp, no_traces=no_traces, 
                                           max_trace_length=max_trace_length, smap=smap, worktime=worktime, datafunc=datafunc)
        df = log_converter.apply(simulated_log, variant=log_converter.Variants.TO_DATA_FRAME)
        return df

    def strip_start(self, df, caseCol="case:id", prob=0.25, n=1):
        ''' 
        Delete the start event(s) of random traces

        Parameters:
        ------------------------------
        df: pandas DataFrame (the event log)
        caseCol: string      (the column holding the case ID)
        prob: float          (the percentage of traces to modify)
        n: int               (maximum number of events to delete per trace)
            
        '''

        assert n!=0, "Please make sure to select n bigger than 0."
        cases = list(df[caseCol].unique())
        modify = random.sample(cases, int(prob*len(cases)))
        droprange = [j+1 for j in range(n)]
        
        for i in modify:
            dropnum = np.random.choice(droprange)
            index = df[df[caseCol] == str(i)].index[:dropnum]
            df.drop(labels=index, axis=0, inplace=True)
        
        return df

    def strip_end(self, df, caseCol="case:id", prob=0.25, n=1):
        ''' 
        Delete the end event(s) of random traces

        Parameters:
        ------------------------------
        df: pandas DataFrame (the event log)
        caseCol: string      (the column holding the case ID)
        prob: float          (the percentage of traces to modify)
        n: int               (maximum number of events to delete per trace)
            
        '''
        
        assert n!=0, "Please make sure to choose n bigger than 0."
        cases = list(df[caseCol].unique())
        modify = random.sample(cases, int(prob*len(cases)))
        droprange = [-j for j in range(n, n+1)]
        
        for i in modify:
            dropnum = np.random.choice(droprange)
            index = df[df[caseCol] == str(i)].index[dropnum:]
            df.drop(labels=index, axis=0, inplace=True)
        
        return df

    def addDoubles(self, df, caseCol="case:id", prob=0.25):
        ''' 
        Add already occuring events once again

        Parameters:
        ------------------------------
        df: pandas DataFrame (the event log)
        caseCol: string      (the column holding the case ID)
        prob: float          (the percentage of traces to modify)

        '''

        cases = list(df[caseCol].unique())
        modify = random.sample(cases, int(prob*len(cases)))

        for i in modify:
            trace = df[df[caseCol] == str(i)].index
            if len(trace[1:]) > 1:
                index = np.random.choice(trace[1:])
                df.loc[index+0.5] = df.loc[index, :]
                df.sort_index(inplace=True)

                # adjusting time for all following events and traces
                timedelta = df.loc[index]["time:timestamp"] - df.loc[index-1]["time:timestamp"]
                df.loc[index+1:, "time:timestamp"] = df.loc[index+1:, "time:timestamp"] + timedelta
                df.reset_index(drop=True, inplace=True)

        return df

    def addSilence(self, df, caseCol="case:id", prob=0.25):
        ''' 
        Delete a random event (neither start nor end) from random traces

        Parameters:
        ------------------------------
        df: pandas DataFrame (the event log)
        caseCol: string      (the column holding the case ID)
        prob: float          (the percentage of traces to modify)
            
        '''
        
        cases = list(df[caseCol].unique())
        modify = random.sample(cases, int(prob*len(cases)))
        
        for i in modify:
            trace = df[df[caseCol] == str(i)].index
            if len(trace) > 2:
                index = np.random.choice(trace[1:-1])
                df.drop(labels=index, axis=0, inplace=True)
                df.reset_index(drop=True, inplace=True)
                
        return df

    def switchTimestamps(self, df, caseCol="case:id", prob=0.25):
        ''' 
        Randomly switch timestamps of two activities of random traces

        Parameters:
        ------------------------------
        df: pandas DataFrame (the event log)
        caseCol: string      (the column holding the case ID)
        prob: float          (the percentage of traces to modify)
            
        '''
            
        cases = list(df[caseCol].unique())
        modify = random.sample(cases, int(prob*len(cases)))
        
        for i in modify:
            trace = df[df[caseCol] == str(i)].index
            if len(trace) >= 2:
                i1, i2 = np.random.choice(trace, size=2, replace=False)
                a, b = df.iloc[i1, 1], df.iloc[i2, 1]
                df.iloc[i1, 1], df.iloc[i2, 1] = b, a
                    
        return df
