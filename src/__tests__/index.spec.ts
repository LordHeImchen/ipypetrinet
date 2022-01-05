// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Add any needed widget imports here (or from controls)
// import {} from '@jupyter-widgets/base';

import { createTestModel } from './utils';
import { PetriModel } from '..';

describe('Example', () => {
  describe('PetriModel', () => {
    it('should be createable', () => {
      const model = createTestModel(PetriModel);
      expect(model).toBeInstanceOf(PetriModel);
      expect(model.get('graph')).toEqual([]);
    });

    // it('should be createable with a value', () => {
    //   const state = { value: "Foo Bar!" };
    //   const model = createTestModel(PetriModel, state);
    //   expect(model).toBeInstanceOf(PetriModel);
    //   expect(model.get('value')).toEqual("Foo Bar!");
    // });
  });
});
