#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jakob Bucksch.
# Distributed under the terms of the Modified BSD License.

import pytest
from ..widget import PetriWidget


def test_example_creation_blank():
    w = PetriWidget()
    assert w.graph == []
