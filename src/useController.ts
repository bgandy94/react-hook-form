import * as React from 'react';

import getControllerValue from './logic/getControllerValue';
import isNameInFieldArray from './logic/isNameInFieldArray';
import get from './utils/get';
import isUndefined from './utils/isUndefined';
import { EVENTS } from './constants';
import {
  FieldPath,
  FieldValues,
  InternalFieldName,
  UseControllerProps,
  UseControllerReturn,
} from './types';
import { useFormContext } from './useFormContext';
import { useFormState } from './useFormState';

export function useController<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  rules,
  defaultValue,
  control,
  shouldUnregister,
}: UseControllerProps<TFieldValues, TName>): UseControllerReturn<
  TFieldValues,
  TName
> {
  const methods = useFormContext<TFieldValues>();
  const {
    defaultValuesRef,
    register,
    fieldsRef,
    unregister,
    fieldArrayNamesRef,
    controllerSubjectRef,
    shouldUnmount,
    inFieldArrayActionRef,
  } = control || methods.control;

  const isFieldArray = isNameInFieldArray(fieldArrayNamesRef.current, name);
  const field = get(fieldsRef.current, name);
  const [value, setInputStateValue] = React.useState(
    isFieldArray
      ? defaultValue
      : field && field._f
      ? field._f.value
      : isUndefined(defaultValue)
      ? get(defaultValuesRef.current, name)
      : defaultValue,
  );
  const { onChange, onBlur, ref } = register(name, {
    ...rules,
    value,
  });
  const formState = useFormState({
    control: control || methods.control,
    name,
  });

  React.useEffect(() => {
    const controllerSubscription = controllerSubjectRef.current.subscribe({
      next: (data) =>
        (!data.name || name === data.name) &&
        setInputStateValue(get(data.values, name)),
    });

    return () => {
      controllerSubscription.unsubscribe();
      const shouldUnmountField = shouldUnmount || shouldUnregister;

      if (
        isFieldArray
          ? shouldUnmountField && !inFieldArrayActionRef.current
          : shouldUnmountField
      ) {
        unregister(name);
      } else if (get(fieldsRef.current, name)) {
        get(fieldsRef.current, name)._f.mount = false;
      }
    };
  }, [name]);

  return {
    field: {
      onChange: (event: any) => {
        const value = getControllerValue(event);
        setInputStateValue(value);

        onChange({
          target: {
            value,
            name: name as InternalFieldName,
          },
          type: EVENTS.CHANGE,
        });
      },
      onBlur: () => {
        onBlur({
          target: {
            name: name as InternalFieldName,
          },
          type: EVENTS.BLUR,
        });
      },
      name,
      value,
      ref: (elm) => elm && ref(elm),
    },
    formState,
    fieldState: {
      invalid: !!get(formState.errors, name),
      isDirty: !!get(formState.dirtyFields, name),
      isTouched: !!get(formState.touchedFields, name),
      error: get(formState.errors, name),
    },
  };
}
