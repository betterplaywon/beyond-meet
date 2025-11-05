# Store

Redux Toolkit 상태 관리 설정을 저장하는 폴더입니다.

## 폴더 구조

- `slices/` - Redux Toolkit slices
- `store.ts` - Redux store 설정

## Slice 작성 규칙

- Redux Toolkit의 `createSlice` 사용
- 비동기 작업은 `createAsyncThunk` 사용
- TypeScript 타입 정의 필수

## 예시

```typescript
// store/slices/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../../services/endpoints/user';

export const fetchUser = createAsyncThunk(
  'user/fetch',
  async (userId: string) => {
    const response = await userApi.getUser(userId);
    return response.data;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    currentUser: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearUser: (state) => {
      state.currentUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;
```
