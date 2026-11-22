'use client';

import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

export function PasswordField(props: Omit<TextFieldProps, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        ...props.slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((current) => !current)}
                onMouseDown={(event) => event.preventDefault()}
              >
                {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
